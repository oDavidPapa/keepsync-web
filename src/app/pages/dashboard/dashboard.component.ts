import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PageHeaderComponent } from '../../core/ui/page-header/page-header.component';
import { ToastService } from '../../core/ui/toast/toast.service';
import { DashboardService } from '../../modules/dashboard/api/dashboard.service';
import { DashboardSummaryResponse, DashboardUpcomingReservationResponse } from '../../modules/dashboard/api/dashboard.models';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly summary = signal<DashboardSummaryResponse | null>(null);
  readonly defaultMonth = this.currentMonthValue();

  readonly filterForm = this.formBuilder.group({
    month: [this.defaultMonth],
  });

  readonly monthChipLabel = computed(() => {
    const summaryMonthReference = this.summary()?.period.monthReference;
    if (summaryMonthReference) {
      return this.formatMonthReference(summaryMonthReference);
    }

    const selectedMonth = this.filterForm.getRawValue().month ?? this.defaultMonth;
    return this.formatMonthReference(selectedMonth);
  });

  readonly conflictLabel = computed(() => {
    const openConflicts = this.summary()?.kpis.openConflicts ?? 0;
    return openConflicts === 0 ? 'nenhum conflito' : `${openConflicts} conflitos`;
  });

  readonly upcomingCheckIns = computed(() => (this.summary()?.upcomingCheckIns ?? []).slice(0, 4));
  readonly channelRows = computed(() => this.summary()?.channels ?? []);
  readonly propertyValueRows = computed(() => (this.summary()?.propertyValues ?? []).slice(0, 4));
  readonly occupancyRows = computed(() => (this.summary()?.occupancyByProperty ?? []).slice(0, 4));

  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dashboardService: DashboardService,
    private readonly toastService: ToastService,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {
    this.filterForm.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadDashboard());

    this.loadDashboard();
  }

  loadDashboard() {
    this.loading.set(true);
    this.error.set(null);

    const selectedMonth = (this.filterForm.getRawValue().month ?? '').trim() || this.defaultMonth;

    this.dashboardService.getSummary({ month: selectedMonth }).subscribe({
      next: (dashboardSummary) => {
        this.summary.set(dashboardSummary);
        this.loading.set(false);
      },
      error: (errorResponse) => {
        const message = apiErrorMessage(errorResponse, 'Falha ao carregar o dashboard.');
        this.error.set(message);
        this.toastService.error(message);
        this.loading.set(false);
      },
    });
  }

  openReservation(reservationPublicId: string) {
    this.router.navigate(['/app/reservations', reservationPublicId, 'edit']);
  }

  channelDisplayName(channel: string | null | undefined): string {
    if (!channel || !channel.trim()) {
      return 'Sem canal';
    }

    const normalized = channel.trim().toUpperCase();
    if (normalized === 'AIRBNB') return 'Airbnb';
    if (normalized === 'BOOKING') return 'Booking';
    if (normalized === 'MANUAL') return 'Manual';
    if (normalized === 'SITE') return 'Site';
    return normalized;
  }

  channelPillClass(channel: string | null | undefined): string {
    const normalized = (channel ?? '').trim().toUpperCase();
    if (normalized === 'AIRBNB') return 'airbnb';
    if (normalized === 'BOOKING') return 'booking';
    return 'default';
  }

  reservationStatusLabel(status: DashboardUpcomingReservationResponse['status']): string {
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

  checkInTag(startAt: string): string | null {
    const checkInDate = new Date(startAt);
    const today = new Date();

    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfCheckIn = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());

    const dayDifference = Math.round((startOfCheckIn.getTime() - startOfToday.getTime()) / 86400000);
    if (dayDifference === 1) {
      return 'amanha';
    }

    if (dayDifference === 0) {
      return 'hoje';
    }

    return null;
  }

  occupancyWidth(percent: number | null | undefined): number {
    if (percent == null) {
      return 0;
    }

    if (percent < 0) return 0;
    if (percent > 100) return 100;
    return percent;
  }

  formatCurrency(value: number | null | undefined): string {
    if (value == null) {
      return '-';
    }
    return this.currencyFormatter.format(value);
  }

  formatPercent(value: number | null | undefined): string {
    if (value == null) {
      return '0,0%';
    }

    return `${Number(value).toFixed(1).replace('.', ',')}%`;
  }

  formatMonthReference(monthReference: string | null | undefined): string {
    if (!monthReference) {
      return '-';
    }

    const [year, month] = monthReference.split('-');
    if (!year || !month) {
      return monthReference;
    }

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthIndex = Number(month) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      return monthReference;
    }

    return `${monthNames[monthIndex]} / ${year}`;
  }

  private currentMonthValue(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }
}
