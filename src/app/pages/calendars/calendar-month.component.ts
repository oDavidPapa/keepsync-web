import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { Page } from '../../core/api/api.models';
import { PageHeaderComponent } from '../../core/ui/page-header/page-header.component';
import { ToastService } from '../../core/ui/toast/toast.service';
import { CalendarProviderItem } from '../../modules/calendar-providers/api/calendar-provider.models';
import { CalendarProviderService } from '../../modules/calendar-providers/api/calendar-provider.service';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';
import { PropertyResponse } from '../../modules/properties/api/property.models';
import { PropertyService } from '../../modules/properties/api/property.service';
import { ReservationResponse, ReservationStatus } from '../../modules/reservations/api/reservation.models';
import { ReservationService } from '../../modules/reservations/api/reservation.service';
import { UserListItemResponse } from '../../modules/users/api/user.models';
import { UserService } from '../../modules/users/api/user.service';

type CalendarChannel = string;

interface CalendarChannelOption {
  id: string;
  label: string;
  color: string;
}

interface CalendarPropertyOption {
  id: string;
  name: string;
}

interface CalendarOwnerUserOption {
  publicId: string;
  label: string;
}

interface CalendarReservation {
  id: string;
  propertyId: string;
  propertyName: string;
  channel: CalendarChannel;
  startAt: string;
  endAt: string;
  startAtMs: number;
  endAtMs: number;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
}

interface DayCell {
  date: Date;
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  bookings: CalendarReservation[];
  hasConflict: boolean;
}

interface Week {
  weekStart: Date;
  days: DayCell[];
  lanes: SegmentLane[];
}

interface Segment {
  reservation: CalendarReservation;
  startCol: number;
  endCol: number;
  isStart: boolean;
  isEnd: boolean;
}

type SegmentLane = Segment[];

@Component({
  selector: 'app-calendar-month',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './calendar-month.component.html',
  styleUrl: './calendar-month.component.scss',
})
export class CalendarMonthComponent {
  private static readonly PROPERTY_FILTER_ALL = 'all';
  private static readonly PAGE_SIZE = 200;
  private static readonly CHANNEL_COLOR_FALLBACK = '#4B708F';

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly currentMonth = signal(this.startOfMonth(new Date()));
  readonly month = computed(() => this.currentMonth());

  private readonly mobileViewport = signal(false);
  readonly isMobile = computed(() => this.mobileViewport());

  readonly availableChannels = signal<CalendarChannelOption[]>([]);
  readonly channelFilters = signal<Record<string, boolean>>({});

  readonly showOnlyConflicts = signal(false);
  readonly includeInactiveProperties = signal(false);
  readonly selectedPropertyId = signal<string>(CalendarMonthComponent.PROPERTY_FILTER_ALL);
  readonly isCurrentUserAdmin = signal(false);
  readonly selectedOwnerUserPublicId = signal('');
  readonly calendarOwnerUsers = signal<CalendarOwnerUserOption[]>([]);

  private readonly propertyOptions = signal<CalendarPropertyOption[]>([]);
  readonly properties = computed(() => this.propertyOptions());

  private readonly calendarReservations = signal<CalendarReservation[]>([]);

  readonly reservationsMatchingBaseFilters = computed(() => {
    const activeChannelFilters = this.channelFilters();
    const selectedPropertyId = this.selectedPropertyId();

    return this.calendarReservations().filter((reservation) => {
      const matchesChannel = activeChannelFilters[reservation.channel] ?? false;
      const matchesProperty =
        selectedPropertyId === CalendarMonthComponent.PROPERTY_FILTER_ALL
          ? true
          : reservation.propertyId === selectedPropertyId;

      return matchesChannel && matchesProperty;
    });
  });

  readonly conflictingReservationIds = computed(() => {
    const conflictingReservationIds = new Set<string>();
    const reservationsByProperty = new Map<string, CalendarReservation[]>();

    this.reservationsMatchingBaseFilters().forEach((reservation) => {
      const propertyReservations = reservationsByProperty.get(reservation.propertyId) ?? [];
      propertyReservations.push(reservation);
      reservationsByProperty.set(reservation.propertyId, propertyReservations);
    });

    reservationsByProperty.forEach((propertyReservations) => {
      const sortedReservations = [...propertyReservations].sort((leftReservation, rightReservation) => {
        if (leftReservation.startAtMs !== rightReservation.startAtMs) {
          return leftReservation.startAtMs - rightReservation.startAtMs;
        }

        return leftReservation.endAtMs - rightReservation.endAtMs;
      });

      const activeReservations: CalendarReservation[] = [];

      sortedReservations.forEach((reservation) => {
        const overlappingReservations = activeReservations.filter(
          (activeReservation) => activeReservation.endAtMs > reservation.startAtMs
        );

        overlappingReservations.forEach((overlappingReservation) => {
          conflictingReservationIds.add(overlappingReservation.id);
          conflictingReservationIds.add(reservation.id);
        });

        activeReservations.length = 0;
        activeReservations.push(...overlappingReservations, reservation);
      });
    });

    return conflictingReservationIds;
  });

  readonly filteredReservations = computed(() => {
    const reservations = this.reservationsMatchingBaseFilters();

    if (!this.showOnlyConflicts()) {
      return reservations;
    }

    const conflictingReservationIds = this.conflictingReservationIds();
    return reservations.filter((reservation) => conflictingReservationIds.has(reservation.id));
  });

  readonly visibleMonthReservations = computed(() => {
    const monthStart = this.month();
    const monthStartIso = this.toISO(monthStart);
    const monthEndIso = this.toISO(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));

    return this.filteredReservations().filter((reservation) => {
      const occupiedEndDate = this.addDaysISO(reservation.endDate, -1);
      return !(occupiedEndDate < monthStartIso || reservation.startDate > monthEndIso);
    });
  });

  readonly monthLabel = computed(() =>
    this.month().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  );

  readonly emptyStateMessage = computed(() =>
    this.showOnlyConflicts()
      ? 'Nenhum conflito encontrado para os filtros selecionados neste mes.'
      : 'Nenhuma reserva encontrada para os filtros selecionados neste mes.'
  );

  readonly days = computed<DayCell[]>(() => {
    const monthStart = this.month();
    const gridStartDate = this.startOfWeek(this.startOfMonth(monthStart));
    const todayIso = this.toISO(new Date());
    const reservations = this.filteredReservations();

    const dayCells: DayCell[] = [];

    for (let dayIndex = 0; dayIndex < 42; dayIndex++) {
      const cellDate = new Date(gridStartDate);
      cellDate.setDate(cellDate.getDate() + dayIndex);

      const isoDate = this.toISO(cellDate);
      const bookings = reservations.filter((reservation) => this.intersectsDay(reservation, isoDate));

        dayCells.push({
          date: cellDate,
          iso: isoDate,
          day: cellDate.getDate(),
          inMonth: cellDate.getMonth() === monthStart.getMonth(),
          isToday: isoDate === todayIso,
          bookings,
          hasConflict: this.hasConflictOnDay(bookings, isoDate),
        });
      }

    return dayCells;
  });

  readonly weeks = computed<Week[]>(() => {
    const dayCells = this.days();
    const reservations = this.filteredReservations();

    return Array.from({ length: 6 }, (_, weekIndex) => {
      const weekDays = dayCells.slice(weekIndex * 7, weekIndex * 7 + 7);
      const weekStart = new Date(weekDays[0].date);
      const weekEnd = new Date(weekDays[6].date);

      const reservationSegments = reservations
        .map((reservation) => this.segmentForWeek(reservation, weekStart, weekEnd))
        .filter((segment): segment is Segment => segment !== null)
        .sort((leftSegment, rightSegment) => {
          if (leftSegment.startCol !== rightSegment.startCol) {
            return leftSegment.startCol - rightSegment.startCol;
          }

          return (
            rightSegment.endCol -
            rightSegment.startCol -
            (leftSegment.endCol - leftSegment.startCol)
          );
        });

      return {
        weekStart,
        days: weekDays,
        lanes: this.packIntoLanes(reservationSegments),
      };
    });
  });

  constructor(
    private readonly router: Router,
    private readonly reservationService: ReservationService,
    private readonly propertyService: PropertyService,
    private readonly calendarProviderService: CalendarProviderService,
    private readonly userService: UserService,
    private readonly toast: ToastService,
    private readonly destroyRef: DestroyRef
  ) {
    this.initializeViewportMode();
    this.initializeCalendarContext();
  }

  prevMonth() {
    const previousMonth = new Date(this.month());
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    this.currentMonth.set(this.startOfMonth(previousMonth));
  }

  nextMonth() {
    const nextMonth = new Date(this.month());
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.currentMonth.set(this.startOfMonth(nextMonth));
  }

  goToday() {
    this.currentMonth.set(this.startOfMonth(new Date()));
  }

  toggleChannel(channel: CalendarChannel) {
    this.channelFilters.update((filters) => ({
      ...filters,
      [channel]: !filters[channel],
    }));
  }

  toggleConflictFilter() {
    this.showOnlyConflicts.update((currentValue) => !currentValue);
  }

  toggleInactivePropertyVisibility() {
    this.includeInactiveProperties.update((currentValue) => !currentValue);
    this.selectedPropertyId.set(CalendarMonthComponent.PROPERTY_FILTER_ALL);
    this.loadCalendarData();
  }

  channelLabel(channel: CalendarChannel): string {
    return this.availableChannels().find((availableChannel) => availableChannel.id === channel)?.label ?? channel;
  }

  channelColor(channel: CalendarChannel): string {
    return this.availableChannels().find((availableChannel) => availableChannel.id === channel)?.color
      ?? CalendarMonthComponent.CHANNEL_COLOR_FALLBACK;
  }

  reservationBarBackground(channel: CalendarChannel): string {
    return this.hexToRgba(this.channelColor(channel), 0.16);
  }

  reservationBarLabel(reservation: CalendarReservation): string {
    return this.selectedPropertyId() === CalendarMonthComponent.PROPERTY_FILTER_ALL
      ? reservation.propertyName
      : this.channelLabel(reservation.channel);
  }

  reservationTooltip(reservation: CalendarReservation): string {
    const checkInDate = this.formatDate(reservation.startDate);
    const checkOutDate = this.formatDate(reservation.endDate);
    return `${reservation.propertyName} | ${this.channelLabel(reservation.channel)} | ${checkInDate} a ${checkOutDate}`;
  }

  laneRows(count: number): string {
    return `repeat(${Math.max(1, count)}, 24px)`;
  }

  openReservation(reservation: CalendarReservation) {
    if (!reservation?.id) {
      return;
    }

    this.router.navigate(['/app/reservations', reservation.id, 'edit']);
  }

  onOwnerUserChange(ownerUserPublicId: string) {
    this.selectedOwnerUserPublicId.set((ownerUserPublicId ?? '').trim());
    this.selectedPropertyId.set(CalendarMonthComponent.PROPERTY_FILTER_ALL);
    this.loadCalendarData();
  }

  requiresOwnerSelection(): boolean {
    return this.isCurrentUserAdmin() && !this.selectedOwnerUserPublicId();
  }

  private loadCalendarData() {
    if (this.requiresOwnerSelection()) {
      this.clearCalendarData();
      this.loading.set(false);
      this.error.set(null);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const ownerUserPublicId = this.ownerUserPublicIdFilter();

    forkJoin({
      reservations: this.loadAllReservations(ownerUserPublicId),
      properties: this.loadAllProperties(ownerUserPublicId).pipe(catchError(() => of([] as PropertyResponse[]))),
      enabledProviders: this.calendarProviderService
        .listEnabledForCurrentUser(ownerUserPublicId)
        .pipe(
          map((response) => response.providers ?? []),
          catchError(() => of([] as CalendarProviderItem[]))
        ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ reservations, properties, enabledProviders }) => {
          const channelOptions = enabledProviders.map((provider) => ({
            id: this.normalizeChannel(provider.code),
            label: provider.displayName?.trim() || this.normalizeChannel(provider.code),
            color: provider.color?.trim() || CalendarMonthComponent.CHANNEL_COLOR_FALLBACK,
          }));
          const enabledChannelCodes = new Set(channelOptions.map((channelOption) => channelOption.id));

          const mappedReservations = reservations
            .filter((reservation) => reservation.status !== 'CANCELLED')
            .map((reservation) => this.mapReservationToCalendarReservation(reservation))
            .filter((reservation): reservation is CalendarReservation => this.isValidCalendarReservation(reservation))
            .filter((reservation) => enabledChannelCodes.has(reservation.channel));

          this.availableChannels.set(channelOptions);
          this.syncChannelFilters(channelOptions);

          this.calendarReservations.set(mappedReservations);
          this.propertyOptions.set(this.buildPropertyOptions(properties, mappedReservations));

          const selectedPropertyId = this.selectedPropertyId();
          const hasSelectedProperty = this.propertyOptions().some((property) => property.id === selectedPropertyId);
          if (
            selectedPropertyId !== CalendarMonthComponent.PROPERTY_FILTER_ALL &&
            !hasSelectedProperty
          ) {
            this.selectedPropertyId.set(CalendarMonthComponent.PROPERTY_FILTER_ALL);
          }

          this.loading.set(false);
        },
        error: (error) => {
          const message = apiErrorMessage(error, 'Nao foi possivel carregar o calendario.');
          this.error.set(message);
          this.toast.error(message);
          this.loading.set(false);
        },
      });
  }

  private initializeCalendarContext() {
    this.loading.set(true);
    this.error.set(null);

    this.userService.getCurrentUser()
      .pipe(
        switchMap((currentUser) => {
          const currentUserIsAdmin = this.isAdminRole(currentUser.role);
          this.isCurrentUserAdmin.set(currentUserIsAdmin);

          if (!currentUserIsAdmin) {
            this.calendarOwnerUsers.set([]);
            this.selectedOwnerUserPublicId.set('');
            return of([] as UserListItemResponse[]);
          }

          return this.loadAllOwnerUsers();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (ownerUsers) => {
          if (this.isCurrentUserAdmin()) {
            this.calendarOwnerUsers.set(this.mapOwnerUsersToOptions(ownerUsers));
            this.selectedOwnerUserPublicId.set('');
            this.clearCalendarData();
            this.loading.set(false);
            return;
          }

          this.loadCalendarData();
        },
        error: (error) => {
          const message = apiErrorMessage(error, 'Nao foi possivel carregar o contexto do calendario.');
          this.error.set(message);
          this.toast.error(message);
          this.loading.set(false);
        }
      });
  }

  private loadAllReservations(ownerUserPublicId?: string): Observable<ReservationResponse[]> {
    const includeInactiveProperties = this.includeInactiveProperties();
    return this.collectAllPages((pageNumber) =>
      this.reservationService.list({
        page: pageNumber,
        size: CalendarMonthComponent.PAGE_SIZE,
        sort: 'startAt,asc',
        includeInactiveProperties,
        ownerUserPublicId,
      })
    );
  }

  private loadAllProperties(ownerUserPublicId?: string): Observable<PropertyResponse[]> {
    const includeInactiveProperties = this.includeInactiveProperties();
    return this.collectAllPages((pageNumber) =>
      this.propertyService.list({
        page: pageNumber,
        size: CalendarMonthComponent.PAGE_SIZE,
        sort: 'name,asc',
        status: includeInactiveProperties ? undefined : 'ACTIVE',
        ownerUserPublicId,
      })
    );
  }

  private loadAllOwnerUsers(): Observable<UserListItemResponse[]> {
    return this.collectAllPages((pageNumber) =>
      this.userService.listUsers({
        page: pageNumber,
        size: CalendarMonthComponent.PAGE_SIZE,
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

        const remainingRequests = Array.from({ length: totalPages - 1 }, (_, pageIndex) =>
          loadPage(pageIndex + 1)
        );

        return forkJoin(remainingRequests).pipe(
          map((remainingPages) => [firstPage, ...remainingPages].flatMap((page) => page?.content ?? []))
        );
      })
    );
  }

  private buildPropertyOptions(
    properties: PropertyResponse[],
    reservations: CalendarReservation[]
  ): CalendarPropertyOption[] {
    const propertyMap = new Map<string, string>();

    properties.forEach((property) => {
      const propertyId = String(property.publicId ?? '').trim();
      const propertyName = String(property.name ?? '').trim();
      const propertyLabel = property.active ? propertyName : `${propertyName} (Inativa)`;
      if (propertyId && propertyName) {
        propertyMap.set(propertyId, propertyLabel);
      }
    });

    reservations.forEach((reservation) => {
      if (!propertyMap.has(reservation.propertyId)) {
        propertyMap.set(reservation.propertyId, reservation.propertyName);
      }
    });

    return Array.from(propertyMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((leftProperty, rightProperty) => leftProperty.name.localeCompare(rightProperty.name, 'pt-BR'));
  }

  private mapReservationToCalendarReservation(reservation: ReservationResponse): CalendarReservation {
    const startAtMs = this.parseDateTimeToMillis(reservation.startAt);
    const endAtMs = this.parseDateTimeToMillis(reservation.endAt);

    return {
      id: reservation.publicId,
      propertyId: this.normalizePropertyId(reservation.propertyPublicId),
      propertyName: String(reservation.propertyName ?? '').trim() || 'Reserva sem propriedade',
      channel: this.normalizeChannel(reservation.channel),
      startAt: reservation.startAt,
      endAt: reservation.endAt,
      startAtMs,
      endAtMs,
      startDate: this.extractDatePart(reservation.startAt),
      endDate: this.extractDatePart(reservation.endAt),
      status: reservation.status,
    };
  }

  private isValidCalendarReservation(reservation: CalendarReservation): boolean {
    return Boolean(
      reservation.id &&
      reservation.propertyId &&
      reservation.propertyName &&
      reservation.startDate &&
      reservation.endDate &&
      Number.isFinite(reservation.startAtMs) &&
      Number.isFinite(reservation.endAtMs) &&
      reservation.startAtMs < reservation.endAtMs
    );
  }

  private normalizePropertyId(propertyPublicId: string | null | undefined): string {
    return String(propertyPublicId ?? '').trim() || 'UNKNOWN_PROPERTY';
  }

  private normalizeChannel(channel: string | null | undefined): CalendarChannel {
    return String(channel ?? '').trim().toUpperCase();
  }

  private syncChannelFilters(channelOptions: CalendarChannelOption[]) {
    this.channelFilters.update((currentFilters) => {
      const nextFilters: Record<string, boolean> = {};

      channelOptions.forEach((channelOption) => {
        const existingFilterValue = currentFilters[channelOption.id];
        nextFilters[channelOption.id] = typeof existingFilterValue === 'boolean' ? existingFilterValue : true;
      });

      return nextFilters;
    });
  }

  private mapOwnerUsersToOptions(ownerUsers: UserListItemResponse[]): CalendarOwnerUserOption[] {
    return ownerUsers
      .map((ownerUser) => {
        const publicId = String(ownerUser.publicId ?? '').trim();
        const fullName = String(ownerUser.fullName ?? '').trim();
        const email = String(ownerUser.email ?? '').trim();

        if (!publicId) {
          return null;
        }

        const label = fullName && email
          ? `${fullName} (${email})`
          : (fullName || email || publicId);

        return { publicId, label };
      })
      .filter((ownerUserOption): ownerUserOption is CalendarOwnerUserOption => ownerUserOption !== null)
      .sort((leftOption, rightOption) => leftOption.label.localeCompare(rightOption.label, 'pt-BR'));
  }

  private ownerUserPublicIdFilter(): string | undefined {
    if (!this.isCurrentUserAdmin()) {
      return undefined;
    }

    const selectedOwnerUserPublicId = this.selectedOwnerUserPublicId().trim();
    return selectedOwnerUserPublicId || undefined;
  }

  private clearCalendarData() {
    this.availableChannels.set([]);
    this.channelFilters.set({});
    this.propertyOptions.set([]);
    this.calendarReservations.set([]);
    this.selectedPropertyId.set(CalendarMonthComponent.PROPERTY_FILTER_ALL);
  }

  private isAdminRole(role: string | null | undefined): boolean {
    const normalizedRole = String(role ?? '').trim().toUpperCase();
    return normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN';
  }

  private extractDatePart(dateTime: string): string {
    const normalizedValue = String(dateTime ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalizedValue)) {
      return normalizedValue.slice(0, 10);
    }

    const parsedDate = new Date(normalizedValue);
    return Number.isNaN(parsedDate.getTime()) ? '' : this.toISO(parsedDate);
  }

  private parseDateTimeToMillis(dateTime: string): number {
    const normalizedValue = String(dateTime ?? '').trim();
    if (!normalizedValue) {
      return Number.NaN;
    }

    const parsedDate = new Date(normalizedValue);
    return parsedDate.getTime();
  }

  private formatDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map((value) => Number(value));
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  }

  private initializeViewportMode() {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mobileQueryList = window.matchMedia('(max-width: 860px)');
    const updateViewportMode = () => this.mobileViewport.set(mobileQueryList.matches);

    updateViewportMode();

    if (mobileQueryList.addEventListener) {
      mobileQueryList.addEventListener('change', updateViewportMode);
    } else {
      mobileQueryList.addListener(updateViewportMode);
    }
  }

  private intersectsDay(reservation: CalendarReservation, isoDay: string): boolean {
    return reservation.startDate <= isoDay && isoDay < reservation.endDate;
  }

  private hasConflictOnDay(bookings: CalendarReservation[], isoDay: string): boolean {
    const dayStart = this.fromISO(isoDay).getTime();
    const dayEnd = this.fromISO(this.addDaysISO(isoDay, 1)).getTime();

    const intervalsByProperty = new Map<string, Array<{ startMs: number; endMs: number }>>();

    bookings.forEach((booking) => {
      const intersectsDay = booking.startAtMs < dayEnd && booking.endAtMs > dayStart;
      if (!intersectsDay) {
        return;
      }

      const intervalStart = Math.max(booking.startAtMs, dayStart);
      const intervalEnd = Math.min(booking.endAtMs, dayEnd);
      if (intervalStart >= intervalEnd) {
        return;
      }

      const propertyIntervals = intervalsByProperty.get(booking.propertyId) ?? [];
      propertyIntervals.push({ startMs: intervalStart, endMs: intervalEnd });
      intervalsByProperty.set(booking.propertyId, propertyIntervals);
    });

    for (const propertyIntervals of intervalsByProperty.values()) {
      if (propertyIntervals.length < 2) {
        continue;
      }

      const sortedIntervals = [...propertyIntervals].sort((leftInterval, rightInterval) => {
        if (leftInterval.startMs !== rightInterval.startMs) {
          return leftInterval.startMs - rightInterval.startMs;
        }

        return leftInterval.endMs - rightInterval.endMs;
      });

      let activeEnd = sortedIntervals[0].endMs;
      for (let index = 1; index < sortedIntervals.length; index++) {
        const currentInterval = sortedIntervals[index];
        if (currentInterval.startMs < activeEnd) {
          return true;
        }

        activeEnd = currentInterval.endMs;
      }
    }

    return false;
  }

  private segmentForWeek(
    reservation: CalendarReservation,
    weekStart: Date,
    weekEnd: Date
  ): Segment | null {
    const weekStartIso = this.toISO(weekStart);
    const weekEndIso = this.toISO(weekEnd);

    const occupiedEndDate = this.addDaysISO(reservation.endDate, -1);
    if (occupiedEndDate < weekStartIso || reservation.startDate > weekEndIso) {
      return null;
    }

    const segmentStartIso = reservation.startDate < weekStartIso ? weekStartIso : reservation.startDate;
    const segmentEndIso = occupiedEndDate > weekEndIso ? weekEndIso : occupiedEndDate;

    const startCol = this.diffDays(weekStart, this.fromISO(segmentStartIso));
    const endCol = this.diffDays(weekStart, this.fromISO(segmentEndIso));

    return {
      reservation,
      startCol,
      endCol,
      isStart: reservation.startDate >= weekStartIso && reservation.startDate <= weekEndIso,
      isEnd: occupiedEndDate >= weekStartIso && occupiedEndDate <= weekEndIso,
    };
  }

  private packIntoLanes(segments: Segment[]): SegmentLane[] {
    const lanes: SegmentLane[] = [];

    for (const segment of segments) {
      const availableLane = lanes.find((lane) => !this.collidesAny(segment, lane));

      if (availableLane) {
        availableLane.push(segment);
      } else {
        lanes.push([segment]);
      }
    }

    lanes.forEach((lane) => lane.sort((leftSegment, rightSegment) => leftSegment.startCol - rightSegment.startCol));

    return lanes;
  }

  private collidesAny(segment: Segment, lane: SegmentLane): boolean {
    return lane.some(
      (laneSegment) => !(segment.endCol < laneSegment.startCol || segment.startCol > laneSegment.endCol)
    );
  }

  private toISO(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private fromISO(isoDate: string): Date {
    const [year, month, day] = isoDate.split('-').map((value) => Number(value));
    return new Date(year, month - 1, day);
  }

  private addDaysISO(isoDate: string, delta: number): string {
    const updatedDate = this.fromISO(isoDate);
    updatedDate.setDate(updatedDate.getDate() + delta);
    return this.toISO(updatedDate);
  }

  private diffDays(startDate: Date, endDate: Date): number {
    const normalizedStartDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    ).getTime();

    const normalizedEndDate = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    ).getTime();

    return Math.round((normalizedEndDate - normalizedStartDate) / 86400000);
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private startOfWeek(date: Date): Date {
    const normalizedDate = new Date(date);
    const weekday = normalizedDate.getDay();
    normalizedDate.setDate(normalizedDate.getDate() - weekday);
    return new Date(
      normalizedDate.getFullYear(),
      normalizedDate.getMonth(),
      normalizedDate.getDate()
    );
  }

  private hexToRgba(hexColor: string, alpha: number): string {
    const sanitizedHexColor = hexColor.replace('#', '').trim();
    const expandedHexColor = sanitizedHexColor.length === 3
      ? sanitizedHexColor.split('').map((char) => char + char).join('')
      : sanitizedHexColor;

    if (expandedHexColor.length !== 6 || /[^0-9a-f]/i.test(expandedHexColor)) {
      return `rgba(75, 112, 143, ${alpha})`;
    }

    const red = Number.parseInt(expandedHexColor.slice(0, 2), 16);
    const green = Number.parseInt(expandedHexColor.slice(2, 4), 16);
    const blue = Number.parseInt(expandedHexColor.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}
