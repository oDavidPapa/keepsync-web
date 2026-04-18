import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';

import { FilterPanelComponent } from '../../core/ui/filter/filter-panel.component';
import { PageHeaderComponent } from '../../core/ui/page-header/page-header.component';
import { PaginationComponent, PaginationVM } from '../../core/ui/pagination/pagination.component';
import { TableCardComponent } from '../../core/ui/table-card/table-card.component';
import { ToastService } from '../../core/ui/toast/toast.service';
import { NotificationListItemResponse, NotificationStatus, NotificationType } from '../../modules/notifications/api/notification.models';
import { NotificationService } from '../../modules/notifications/api/notification.service';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, FilterPanelComponent, TableCardComponent, PaginationComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent {
  readonly loading = signal(false);
  readonly selectedNotification = signal<NotificationListItemResponse | null>(null);

  private readonly pageNumber = signal(0);
  private readonly pageSize = signal(5);
  private readonly totalElements = signal(0);
  private readonly totalPages = signal(1);
  private readonly pageRows = signal<NotificationListItemResponse[]>([]);

  readonly filterForm = this.formBuilder.group({
    userQuery: [''],
    type: [''],
    status: [''],
    dateFrom: [''],
    dateTo: [''],
  });

  readonly rows = computed(() => this.pageRows());
  readonly paginationVm = computed<PaginationVM>(() => ({
    page: this.pageNumber(),
    size: this.pageSize(),
    totalElements: this.totalElements(),
    totalPages: this.totalPages(),
  }));

  readonly activeFiltersCount = computed(() => {
    const filterValues = this.filterForm.getRawValue();
    return [
      (filterValues.userQuery ?? '').trim(),
      (filterValues.type ?? '').trim(),
      (filterValues.status ?? '').trim(),
      (filterValues.dateFrom ?? '').trim(),
      (filterValues.dateTo ?? '').trim(),
    ].filter(Boolean).length;
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly notificationService: NotificationService,
    private readonly toast: ToastService,
    private readonly destroyRef: DestroyRef
  ) {
    this.filterForm.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageNumber.set(0);
        this.loadNotifications();
      });

    this.loadNotifications();
  }

  clearFilters(): void {
    this.filterForm.reset({
      userQuery: '',
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    });
    this.pageNumber.set(0);
    this.loadNotifications();
  }

  openDetails(item: NotificationListItemResponse): void {
    this.selectedNotification.set(item);
  }

  closeDetails(): void {
    this.selectedNotification.set(null);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.selectedNotification()) {
      this.closeDetails();
    }
  }

  onPageChange(nextPage: number): void {
    if (nextPage === this.pageNumber()) {
      return;
    }

    this.pageNumber.set(nextPage);
    this.loadNotifications();
  }

  onSizeChange(nextSize: number): void {
    if (nextSize === this.pageSize()) {
      return;
    }

    this.pageSize.set(nextSize);
    this.pageNumber.set(0);
    this.loadNotifications();
  }

  typeLabel(type: NotificationType): string {
    switch (type) {
      case 'CONFLICT_OPENED':
        return 'Conflito aberto';
      case 'CONFLICT_RESOLVED':
        return 'Conflito resolvido';
      case 'RESERVATION_CONFIRMED':
        return 'Reserva confirmada';
      case 'RESERVATION_CANCELED':
        return 'Reserva cancelada';
      default:
        return type;
    }
  }

  statusLabel(status: NotificationStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'PROCESSING':
        return 'Processando';
      case 'SENT':
        return 'Enviada';
      case 'FAILED':
        return 'Falhou';
      case 'SKIPPED':
        return 'Ignorada';
      default:
        return status;
    }
  }

  statusBadgeClass(status: NotificationStatus): string {
    switch (status) {
      case 'SENT':
        return 'status-sent';
      case 'FAILED':
        return 'status-failed';
      case 'PROCESSING':
        return 'status-processing';
      case 'SKIPPED':
        return 'status-skipped';
      case 'PENDING':
      default:
        return 'status-pending';
    }
  }

  channelLabel(channel: string): string {
    return channel === 'WHATSAPP' ? 'WhatsApp' : 'E-mail';
  }

  userPrimaryLabel(item: NotificationListItemResponse): string {
    if ((item.ownerUserFullName ?? '').trim()) {
      return String(item.ownerUserFullName).trim();
    }

    if ((item.ownerUserEmail ?? '').trim()) {
      return String(item.ownerUserEmail).trim();
    }

    return `#${item.ownerUserId}`;
  }

  userSecondaryLabel(item: NotificationListItemResponse): string {
    if ((item.ownerUserEmail ?? '').trim()) {
      return String(item.ownerUserEmail).trim();
    }

    if ((item.ownerUserPublicId ?? '').trim()) {
      return String(item.ownerUserPublicId).trim();
    }

    return '-';
  }

  dateTimeLabel(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleString('pt-BR');
  }

  hasDetails(): boolean {
    return this.selectedNotification() !== null;
  }

  private loadNotifications(): void {
    this.loading.set(true);

    const filterValues = this.filterForm.getRawValue();

    this.notificationService.list({
      page: this.pageNumber(),
      size: this.pageSize(),
      sort: 'createdAt,desc',
      userQuery: (filterValues.userQuery ?? '').trim() || undefined,
      type: (filterValues.type ?? '').trim() || undefined,
      status: (filterValues.status ?? '').trim() || undefined,
      dateFrom: (filterValues.dateFrom ?? '').trim() || undefined,
      dateTo: (filterValues.dateTo ?? '').trim() || undefined,
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
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel carregar as notificacoes.'));
        this.loading.set(false);
      },
    });
  }

}
