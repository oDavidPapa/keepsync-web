import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FilterPanelComponent } from '../../core/ui/filter/filter-panel.component';
import { PageHeaderComponent } from '../../core/ui/page-header/page-header.component';
import { PaginationComponent, PaginationVM } from '../../core/ui/pagination/pagination.component';
import { TableCardComponent } from '../../core/ui/table-card/table-card.component';
import { ToastService } from '../../core/ui/toast/toast.service';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';
import { UserListItemResponse, UserPlanCode, UserRole } from '../../modules/users/api/user.models';
import { UserService } from '../../modules/users/api/user.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, FilterPanelComponent, TableCardComponent, PaginationComponent],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent {
  readonly loading = signal(false);
  readonly togglingUserPublicId = signal<string | null>(null);

  private readonly pageNumber = signal(0);
  private readonly pageSize = signal(5);

  private readonly totalElements = signal(0);
  private readonly totalPages = signal(1);
  private readonly pageRows = signal<UserListItemResponse[]>([]);

  readonly filterForm = this.formBuilder.group({
    query: [''],
    role: [''],
    status: [''],
    planCode: [''],
  });

  readonly rows = computed(() => this.pageRows());
  readonly paginationVm = computed<PaginationVM>(() => ({
    page: this.pageNumber(),
    size: this.pageSize(),
    totalElements: this.totalElements(),
    totalPages: this.totalPages(),
  }));

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly userService: UserService,
    private readonly toast: ToastService,
    private readonly destroyRef: DestroyRef
  ) {
    this.filterForm.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageNumber.set(0);
        this.loadUsers();
      });

    this.loadUsers();
  }

  roleLabel(role: UserRole): string {
    return role === 'ADMIN' ? 'Administrador' : 'Usuario';
  }

  roleBadgeClass(role: UserRole): string {
    return role === 'ADMIN' ? 'danger' : 'success';
  }

  planLabel(planCode: UserPlanCode): string {
    switch (planCode) {
      case 'BASIC':
        return 'Basico';
      case 'PRO':
        return 'Pro';
      case 'FREE':
      default:
        return 'Free';
    }
  }

  planBadgeClass(planCode: UserPlanCode): string {
    switch (planCode) {
      case 'PRO':
        return 'pro';
      case 'BASIC':
        return 'basic';
      case 'FREE':
      default:
        return 'free';
    }
  }

  phoneLabel(phoneNumber: string | null | undefined): string {
    const digitsOnly = String(phoneNumber ?? '').replace(/\D/g, '');

    if (!digitsOnly) {
      return '-';
    }

    if (digitsOnly.length === 11) {
      return digitsOnly.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    if (digitsOnly.length === 10) {
      return digitsOnly.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }

    return phoneNumber ?? '-';
  }

  cpfLabel(cpf: string | null | undefined): string {
    const digitsOnly = String(cpf ?? '').replace(/\D/g, '');

    if (digitsOnly.length !== 11) {
      return cpf || '-';
    }

    return digitsOnly.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  subscriptionLabel(user: UserListItemResponse): string {
    if (user.planCode === 'FREE') {
      return 'Sem expiracao';
    }

    if (!user.subscriptionExpiresAt) {
      return 'Nao informado';
    }

    return new Date(user.subscriptionExpiresAt).toLocaleDateString('pt-BR');
  }

  toggleActive(user: UserListItemResponse) {
    if (this.togglingUserPublicId()) {
      return;
    }

    this.togglingUserPublicId.set(user.publicId);

    this.userService.toggleUserActive(user.publicId).subscribe({
      next: (updatedUser) => {
        this.pageRows.update((currentRows) =>
          currentRows.map((currentUser) => currentUser.publicId === updatedUser.publicId ? updatedUser : currentUser)
        );
        this.togglingUserPublicId.set(null);
        this.toast.success(updatedUser.active ? 'Usuario ativado.' : 'Usuario inativado.');
      },
      error: (error) => {
        this.togglingUserPublicId.set(null);
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel atualizar o status do usuario.'));
      }
    });
  }

  clearFilters() {
    this.filterForm.reset({
      query: '',
      role: '',
      status: '',
      planCode: '',
    });
    this.pageNumber.set(0);
    this.loadUsers();
  }

  onPageChange(nextPage: number) {
    if (nextPage === this.pageNumber()) {
      return;
    }

    this.pageNumber.set(nextPage);
    this.loadUsers();
  }

  onSizeChange(nextSize: number) {
    if (nextSize === this.pageSize()) {
      return;
    }

    this.pageSize.set(nextSize);
    this.pageNumber.set(0);
    this.loadUsers();
  }

  readonly activeFiltersCount = computed(() => {
    const filterValues = this.filterForm.getRawValue();

    return [
      (filterValues.query ?? '').trim(),
      (filterValues.role ?? '').trim(),
      (filterValues.status ?? '').trim(),
      (filterValues.planCode ?? '').trim(),
    ].filter(Boolean).length;
  });

  private loadUsers() {
    this.loading.set(true);

    const filterValues = this.filterForm.getRawValue();

    this.userService.listUsers({
      page: this.pageNumber(),
      size: this.pageSize(),
      sort: 'createdAt,desc',
      query: (filterValues.query ?? '').trim() || undefined,
      role: (filterValues.role ?? '').trim() || undefined,
      status: (filterValues.status ?? '').trim() || undefined,
      planCode: (filterValues.planCode ?? '').trim() || undefined,
    }).subscribe({
      next: (pageResult) => {
        const content = pageResult?.content ?? [];
        this.pageRows.set(content);
        this.totalElements.set(Number(pageResult?.totalElements ?? 0));
        this.totalPages.set(Math.max(1, Number(pageResult?.totalPages ?? 1)));
        this.pageNumber.set(Number(pageResult?.number ?? this.pageNumber()));
        this.pageSize.set(Number(pageResult?.size ?? this.pageSize()));
        this.loading.set(false);
      },
      error: (error) => {
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel carregar os usuarios.'));
        this.loading.set(false);
      }
    });
  }
}
