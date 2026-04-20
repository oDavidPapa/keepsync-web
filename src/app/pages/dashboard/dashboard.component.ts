import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { Page } from '../../core/api/api.models';
import { PageHeaderComponent } from '../../core/ui/page-header/page-header.component';
import { ToastService } from '../../core/ui/toast/toast.service';
import { DashboardService } from '../../modules/dashboard/api/dashboard.service';
import { DashboardSummaryResponse, DashboardUpcomingReservationResponse } from '../../modules/dashboard/api/dashboard.models';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';
import { UserListItemResponse } from '../../modules/users/api/user.models';
import { UserService } from '../../modules/users/api/user.service';

interface DashboardOwnerUserOption {
  publicId: string;
  label: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private static readonly PAGE_SIZE = 200;

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
  readonly isCurrentUserAdmin = signal(false);
  readonly selectedOwnerUserPublicId = signal('');
  readonly dashboardOwnerUsers = signal<DashboardOwnerUserOption[]>([]);
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
    private readonly userService: UserService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {
    this.initializeDashboardContext();
  }

  loadDashboard() {
    if (this.requiresOwnerSelection()) {
      this.loading.set(false);
      this.error.set(null);
      this.summary.set(null);
      return;
    }

    const requestId = ++this.requestSequence;
    this.loading.set(true);
    this.error.set(null);

    const selectedPeriodMonths = this.normalizePeriodMonths(this.selectedPeriodMonths());

    this.dashboardService
      .getSummary({
        periodMonths: selectedPeriodMonths,
        ownerUserPublicId: this.ownerUserPublicIdFilter(),
      })
      .subscribe({
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

  onOwnerUserChange(ownerUserPublicId: string) {
    this.selectedOwnerUserPublicId.set((ownerUserPublicId ?? '').trim());
    this.loadDashboard();
  }

  requiresOwnerSelection(): boolean {
    return this.isCurrentUserAdmin() && !this.selectedOwnerUserPublicId().trim();
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

  private initializeDashboardContext() {
    this.loading.set(true);
    this.error.set(null);

    this.userService
      .getCurrentUser()
      .pipe(
        switchMap((currentUser) => {
          const currentUserIsAdmin = this.isAdminRole(currentUser.role);
          this.isCurrentUserAdmin.set(currentUserIsAdmin);

          if (!currentUserIsAdmin) {
            this.dashboardOwnerUsers.set([]);
            this.selectedOwnerUserPublicId.set('');
            return of([] as UserListItemResponse[]);
          }

          return this.loadAllOwnerUsers();
        })
      )
      .subscribe({
        next: (ownerUsers) => {
          if (this.isCurrentUserAdmin()) {
            this.dashboardOwnerUsers.set(this.mapOwnerUsersToOptions(ownerUsers));
            this.selectedOwnerUserPublicId.set('');
            this.summary.set(null);
            this.loading.set(false);
            this.error.set(null);
            return;
          }

          this.loadDashboard();
        },
        error: (errorResponse) => {
          const message = apiErrorMessage(errorResponse, 'Falha ao carregar o contexto do dashboard.');
          this.error.set(message);
          this.toastService.error(message);
          this.loading.set(false);
        },
      });
  }

  private loadAllOwnerUsers(): Observable<UserListItemResponse[]> {
    return this.collectAllPages((pageNumber) =>
      this.userService.listUsers({
        page: pageNumber,
        size: DashboardComponent.PAGE_SIZE,
        sort: 'fullName,asc',
        status: 'ACTIVE',
      })
    );
  }

  private collectAllPages<T>(loadPage: (pageNumber: number) => Observable<Page<T>>): Observable<T[]> {
    return loadPage(0).pipe(
      switchMap((firstPage) => {
        const totalPages = Math.max(1, Number(firstPage?.totalPages ?? 1));
        if (totalPages === 1) {
          return of(firstPage?.content ?? []);
        }

        const remainingRequests = Array.from({ length: totalPages - 1 }, (_, pageIndex) => loadPage(pageIndex + 1));
        return forkJoin(remainingRequests).pipe(
          map((remainingPages) => [firstPage, ...remainingPages].flatMap((page) => page?.content ?? []))
        );
      })
    );
  }

  private mapOwnerUsersToOptions(ownerUsers: UserListItemResponse[]): DashboardOwnerUserOption[] {
    return ownerUsers
      .map((ownerUser) => {
        const publicId = String(ownerUser.publicId ?? '').trim();
        const fullName = String(ownerUser.fullName ?? '').trim();
        const email = String(ownerUser.email ?? '').trim();

        if (!publicId) {
          return null;
        }

        const label = fullName && email ? `${fullName} (${email})` : fullName || email || publicId;
        return { publicId, label };
      })
      .filter((ownerUserOption): ownerUserOption is DashboardOwnerUserOption => ownerUserOption !== null)
      .sort((leftOption, rightOption) => leftOption.label.localeCompare(rightOption.label, 'pt-BR'));
  }

  private isAdminRole(role: string | null | undefined): boolean {
    const normalizedRole = String(role ?? '').trim().toUpperCase();
    return normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN';
  }

  private ownerUserPublicIdFilter(): string | undefined {
    if (!this.isCurrentUserAdmin()) {
      return undefined;
    }

    const selectedOwnerUserPublicId = this.selectedOwnerUserPublicId().trim();
    return selectedOwnerUserPublicId || undefined;
  }

  private normalizePeriodMonths(periodMonths: number | null | undefined): number {
    const normalizedPeriodMonths = Number(periodMonths ?? 0);
    if (this.validPeriodMonths.includes(normalizedPeriodMonths)) {
      return normalizedPeriodMonths;
    }

    return this.defaultPeriodMonths;
  }
}
