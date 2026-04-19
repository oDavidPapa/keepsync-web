import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router } from '@angular/router';

import { PageHeaderComponent } from '../../core/ui/page-header/page-header.component';
import { ToastService } from '../../core/ui/toast/toast.service';
import { DashboardService } from '../../modules/dashboard/api/dashboard.service';
import { DashboardSummaryResponse, DashboardUpcomingReservationResponse } from '../../modules/dashboard/api/dashboard.models';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly periodOptions = [
    { months: 1, label: 'Mes atual' },
    { months: 3, label: '3m' },
    { months: 6, label: '6m' },
    { months: 12, label: '12m' },
  ] as const;
  readonly validPeriodMonths = this.periodOptions.map((option) => option.months) as readonly number[];
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly summary = signal<DashboardSummaryResponse | null>(null);
  readonly defaultPeriodMonths = 1;
  readonly selectedPeriodMonths = signal<number>(this.defaultPeriodMonths);
  private requestSequence = 0;

  readonly conflictLabel = computed(() => {
    const openConflicts = this.summary()?.kpis.openConflicts ?? 0;
    return openConflicts === 0 ? 'nenhum conflito' : `${openConflicts} conflitos`;
  });

  readonly periodCaption = computed(() => {
    const selectedPeriodMonths = this.selectedPeriodMonths();
    if (selectedPeriodMonths === 1) {
      return 'mes atual';
    }

    return `proximos ${selectedPeriodMonths} meses`;
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
    private readonly dashboardService: DashboardService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {
    this.loadDashboard();
  }

  loadDashboard() {
    const requestId = ++this.requestSequence;
    this.loading.set(true);
    this.error.set(null);

    const selectedPeriodMonths = this.normalizePeriodMonths(this.selectedPeriodMonths());

    this.dashboardService.getSummary({ periodMonths: selectedPeriodMonths }).subscribe({
      next: (dashboardSummary) => {
        if (requestId !== this.requestSequence) {
          return;
        }

        this.summary.set(dashboardSummary);
        this.loading.set(false);
      },
      error: (errorResponse) => {
        if (requestId !== this.requestSequence) {
          return;
        }

        const message = apiErrorMessage(errorResponse, 'Falha ao carregar o dashboard.');
        this.error.set(message);
        this.toastService.error(message);
        this.loading.set(false);
      },
    });
  }

  selectPeriod(periodMonths: number) {
    const normalizedPeriodMonths = this.normalizePeriodMonths(periodMonths);
    if (this.selectedPeriodMonths() === normalizedPeriodMonths) {
      return;
    }

    this.selectedPeriodMonths.set(normalizedPeriodMonths);
    this.loadDashboard();
  }

  isPeriodSelected(periodMonths: number): boolean {
    return this.selectedPeriodMonths() === periodMonths;
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

  private normalizePeriodMonths(periodMonths: number | null | undefined): number {
    const normalizedPeriodMonths = Number(periodMonths ?? 0);
    if (this.validPeriodMonths.includes(normalizedPeriodMonths)) {
      return normalizedPeriodMonths;
    }

    return this.defaultPeriodMonths;
  }
}
