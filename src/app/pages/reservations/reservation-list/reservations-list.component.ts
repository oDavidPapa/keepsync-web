import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TableCardComponent } from '../../../core/ui/table-card/table-card.component';
import { PaginationComponent, PaginationVM } from '../../../core/ui/pagination/pagination.component';
import { PageHeaderComponent } from '../../../core/ui/page-header/page-header.component';
import { FilterPanelComponent } from '../../../core/ui/filter/filter-panel.component';
import { ToastService } from '../../../core/ui/toast/toast.service';
import { apiErrorMessage } from '../../../modules/properties/api/api-error.util';
import { ReservationResponse, ReservationStatus } from '../../../modules/reservations/api/reservation.models';
import { ReservationService } from '../../../modules/reservations/api/reservation.service';

@Component({
  selector: 'app-reservations-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TableCardComponent,
    PaginationComponent,
    PageHeaderComponent,
    FilterPanelComponent,
  ],
  templateUrl: './reservations-list.component.html',
  styleUrls: ['./reservations-list.component.scss'],
})
export class ReservationsListComponent {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  private readonly pageNumber = signal(0);
  private readonly pageSize = signal(5);

  private readonly totalElements = signal(0);
  private readonly totalPages = signal(1);

  private readonly pageRows = signal<ReservationResponse[]>([]);

  readonly filterForm = this.fb.group({
    query: [''],
    status: [''],
    includeInactiveProperties: ['ACTIVE_ONLY'],
    conflictFilter: [''],
    periodStart: [''],
    periodEnd: [''],
  });

  readonly rows = computed(() => this.pageRows());

  readonly paginationVm = computed<PaginationVM>(() => ({
    page: this.pageNumber(),
    size: this.pageSize(),
    totalElements: this.totalElements(),
    totalPages: this.totalPages(),
  }));

  readonly activeFiltersCount = computed(() => {
    const filterValues = this.filterForm.value;
    const query = (filterValues.query ?? '').trim();
    const status = (filterValues.status ?? '').trim();
    const includeInactiveProperties = (filterValues.includeInactiveProperties ?? '').trim();
    const conflictFilter = (filterValues.conflictFilter ?? '').trim();
    const periodStart = (filterValues.periodStart ?? '').trim();
    const periodEnd = (filterValues.periodEnd ?? '').trim();
    return (query ? 1 : 0)
      + (status ? 1 : 0)
      + (includeInactiveProperties === 'INCLUDE_INACTIVE' ? 1 : 0)
      + (conflictFilter ? 1 : 0)
      + (periodStart ? 1 : 0)
      + (periodEnd ? 1 : 0);
  });

  constructor(
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly toast: ToastService,
    private readonly reservationService: ReservationService,
    private readonly destroyRef: DestroyRef
  ) {
    this.filterForm.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageNumber.set(0);
        this.load();
      });

    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    const requestPage = this.pageNumber();
    const requestSize = this.pageSize();

    const filterValues = this.filterForm.getRawValue();
    const query = (filterValues.query ?? '').trim() || undefined;
    const status = (filterValues.status ?? '').trim() || undefined;
    const includeInactiveProperties = (filterValues.includeInactiveProperties ?? '').trim() === 'INCLUDE_INACTIVE';
    const conflictFilter = (filterValues.conflictFilter ?? '').trim();
    const onlyConflicts = conflictFilter === 'ONLY';
    const periodStart = (filterValues.periodStart ?? '').trim() || undefined;
    const periodEnd = (filterValues.periodEnd ?? '').trim() || undefined;

    if (this.isInvalidPeriodRange(periodStart, periodEnd)) {
      const message = 'Periodo invalido. A data final deve ser igual ou maior que a data inicial.';
      this.error.set(message);
      this.toast.error(message);
      this.loading.set(false);
      return;
    }

    this.reservationService
      .list({
        page: requestPage,
        size: requestSize,
        sort: 'startAt,asc',
        query,
        status,
        includeInactiveProperties,
        onlyConflicts,
        periodStart,
        periodEnd
      })
      .subscribe({
        next: (pageResult) => {
          const content = pageResult?.content ?? [];
          const totalElements = Number(pageResult?.totalElements ?? 0);
          const totalPages = Number(pageResult?.totalPages ?? 1);
          const number = Number(pageResult?.number ?? requestPage);
          const size = Number(pageResult?.size ?? requestSize);

          this.pageRows.set(content);
          this.totalElements.set(Number.isFinite(totalElements) ? totalElements : 0);
          this.totalPages.set(Math.max(1, Number.isFinite(totalPages) ? totalPages : 1));
          this.pageNumber.set(Number.isFinite(number) ? number : requestPage);
          this.pageSize.set(Number.isFinite(size) ? size : requestSize);
          this.loading.set(false);
        },
        error: (err) => {
          const message = apiErrorMessage(err, 'Falha ao carregar reservas.');
          this.error.set(message);
          this.toast.error(message);
          this.loading.set(false);
          console.error(err);
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

  clearFilters() {
    this.filterForm.reset({
      query: '',
      status: '',
      includeInactiveProperties: 'ACTIVE_ONLY',
      conflictFilter: '',
      periodStart: '',
      periodEnd: ''
    });
    this.pageNumber.set(0);
    this.load();
  }

  edit(publicId: string) {
    this.router.navigate(['/app/reservations', publicId, 'edit']);
  }

  statusLabel(status: ReservationStatus) {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmada';
      case 'POSSIBLY_CANCELLED':
        return 'Possivelmente cancelada';
      case 'CANCELLED':
        return 'Cancelada';
      case 'COMPLETED':
        return 'Concluida';
      default:
        return status;
    }
  }

  statusBadgeClass(status: ReservationStatus) {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'success';
      case 'POSSIBLY_CANCELLED':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      default:
        return '';
    }
  }

  displayAmountLabel(amount: number | null | undefined): string {
    if (amount == null) {
      return '-';
    }

    return this.currencyFormatter.format(amount);
  }

  private isInvalidPeriodRange(periodStart?: string, periodEnd?: string): boolean {
    if (!periodStart || !periodEnd) {
      return false;
    }

    return periodEnd < periodStart;
  }
}
