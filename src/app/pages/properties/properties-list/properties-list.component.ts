import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PropertyService } from '../../../modules/properties/api/property.service';
import { PropertyResponse } from '../../../modules/properties/api/property.models';
import { apiErrorMessage } from '../../../modules/properties/api/api-error.util';
import { ToastService } from '../../../core/ui/toast/toast.service';
import { ConfirmService } from '../../../core/ui/confirm/confirm.service';
import { TableCardComponent } from '../../../core/ui/table-card/table-card.component';
import { PaginationComponent, PaginationVM } from '../../../core/ui/pagination/pagination.component';
import { PageHeaderComponent } from '../../../core/ui/page-header/page-header.component';
import { FilterPanelComponent } from '../../../core/ui/filter/filter-panel.component';

@Component({
  selector: 'app-properties-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TableCardComponent, PaginationComponent, PageHeaderComponent, FilterPanelComponent],
  templateUrl: './properties-list.component.html',
  styleUrls: ['./properties-list.component.scss'],
})
export class PropertiesListComponent {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly pageNumber = signal(0);
  private readonly pageSize = signal(5);

  private readonly totalElements = signal(0);
  private readonly totalPages = signal(1);

  private readonly pageRows = signal<PropertyResponse[]>([]);

  readonly filterForm = this.fb.group({
    query: [''],
    country: [''],
  });

  readonly rows = computed(() => this.pageRows());

  readonly paginationVm = computed<PaginationVM>(() => ({
    page: this.pageNumber(),
    size: this.pageSize(),
    totalElements: this.totalElements(),
    totalPages: this.totalPages(),
  }));

  constructor(
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly toast: ToastService,
    private readonly confirm: ConfirmService,
    private readonly propertyService: PropertyService,
    private readonly destroyRef: DestroyRef
  ) {
    this.filterForm.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pageNumber.set(0));

    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    const requestPage = this.pageNumber();
    const requestSize = this.pageSize();

    console.log('[LOAD] sending', { page: requestPage, size: requestSize });

    this.propertyService
      .list({
        page: requestPage,
        size: requestSize,
        sort: 'createdAt,desc',
      })
      .subscribe({
        next: (pageResult: any) => {
          const content = pageResult?.content ?? [];
          const totalElements = Number(pageResult?.totalElements ?? 0);
          const totalPages = Number(pageResult?.totalPages ?? 1);
          const number = Number(pageResult?.number ?? requestPage);
          const size = Number(pageResult?.size ?? requestSize);

          console.log('[LOAD] received', { totalElements, totalPages, number, size, contentLen: content.length });

          this.pageRows.set(content);
          this.totalElements.set(Number.isFinite(totalElements) ? totalElements : 0);
          this.totalPages.set(Math.max(1, Number.isFinite(totalPages) ? totalPages : 1));

          this.pageNumber.set(Number.isFinite(number) ? number : requestPage);
          this.pageSize.set(Number.isFinite(size) ? size : requestSize);

          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(apiErrorMessage(err, 'Falha ao carregar propriedades.'));
          console.error(err);
          this.loading.set(false);
        },
      });
  }

  onPageChange(nextPage: number) {
    if (nextPage === this.pageNumber()) return;
    this.pageNumber.set(nextPage);
    this.load();
  }

  onSizeChange(nextSize: number) {
    if (nextSize === this.pageSize()) return;
    this.pageSize.set(nextSize);
    this.pageNumber.set(0);
    this.load();
  }

  goNew() {
    this.router.navigate(['/app/properties/new']);
  }

  edit(publicId: string) {
    this.router.navigate(['/app/properties', publicId, 'edit']);
  }

  clearFilters() {
    this.filterForm.reset({ query: '', country: '' });
    this.pageNumber.set(0);
  }

  remove(row: PropertyResponse) {
    this.confirm
      .ask({
        title: 'Excluir propriedade',
        message: `Deseja excluir a propriedade "${row.name}"?`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        tone: 'danger',
        hint: 'Essa ação não pode ser desfeita.',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.propertyService.delete(row.publicId).subscribe({
          next: () => {
            this.toast.success('Propriedade excluída.');
            this.load();
          },
          error: (err) => {
            this.toast.error(apiErrorMessage(err, 'Não foi possível excluir a propriedade.'));
            console.error(err);
          },
        });
      });
  }

  toggleActive(row: PropertyResponse) {
    this.propertyService.toggleActive(row.publicId).subscribe({
      next: (updated) => {
        this.pageRows.update((current) =>
          current.map((item) => (item.publicId === updated.publicId ? updated : item))
        );
        this.toast.success(updated.active ? 'Propriedade ativada.' : 'Propriedade inativada.');
      },
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Não foi possível atualizar o status.'));
        console.error(err);
      },
    });
  }

  readonly activeFiltersCount = computed(() => {
    const v = this.filterForm.value;
    const query = (v.query ?? '').trim();
    const country = (v.country ?? '').trim();
    return (query ? 1 : 0) + (country ? 1 : 0);
  });

}
