import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { Page } from '../../core/api/api.models';
import { PageHeaderComponent } from '../../core/ui/page-header/page-header.component';
import { ToastService } from '../../core/ui/toast/toast.service';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';
import { PropertyResponse } from '../../modules/properties/api/property.models';
import { PropertyService } from '../../modules/properties/api/property.service';
import { ReservationResponse, ReservationStatus } from '../../modules/reservations/api/reservation.models';
import { ReservationService } from '../../modules/reservations/api/reservation.service';

type CalendarChannel = 'AIRBNB' | 'BOOKING' | 'VRBO' | 'OTHER';

interface CalendarPropertyOption {
  id: string;
  name: string;
}

interface CalendarReservation {
  id: string;
  propertyId: string;
  propertyName: string;
  channel: CalendarChannel;
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

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly currentMonth = signal(this.startOfMonth(new Date()));
  readonly month = computed(() => this.currentMonth());

  private readonly mobileViewport = signal(false);
  readonly isMobile = computed(() => this.mobileViewport());

  readonly availableChannels: ReadonlyArray<{ id: CalendarChannel; label: string }> = [
    { id: 'AIRBNB', label: 'AIRBNB' },
    { id: 'BOOKING', label: 'BOOKING' },
    { id: 'VRBO', label: 'VRBO' },
    { id: 'OTHER', label: 'OUTRO' },
  ];

  readonly channelFilters = signal<Record<CalendarChannel, boolean>>({
    AIRBNB: true,
    BOOKING: true,
    VRBO: true,
    OTHER: true,
  });

  readonly showOnlyConflicts = signal(false);
  readonly selectedPropertyId = signal<string>(CalendarMonthComponent.PROPERTY_FILTER_ALL);

  private readonly propertyOptions = signal<CalendarPropertyOption[]>([]);
  readonly properties = computed(() => this.propertyOptions());

  private readonly calendarReservations = signal<CalendarReservation[]>([]);

  readonly reservationsMatchingBaseFilters = computed(() => {
    const activeChannelFilters = this.channelFilters();
    const selectedPropertyId = this.selectedPropertyId();

    return this.calendarReservations().filter((reservation) => {
      const matchesChannel = activeChannelFilters[reservation.channel];
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
        if (leftReservation.startDate !== rightReservation.startDate) {
          return leftReservation.startDate.localeCompare(rightReservation.startDate);
        }

        return leftReservation.endDate.localeCompare(rightReservation.endDate);
      });

      const activeReservations: CalendarReservation[] = [];

      sortedReservations.forEach((reservation) => {
        const overlappingReservations = activeReservations.filter(
          (activeReservation) => activeReservation.endDate > reservation.startDate
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
          hasConflict: this.hasConflictOnDay(bookings),
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
    private readonly reservationService: ReservationService,
    private readonly propertyService: PropertyService,
    private readonly toast: ToastService,
    private readonly destroyRef: DestroyRef
  ) {
    this.initializeViewportMode();
    this.loadCalendarData();
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

  channelLabel(channel: CalendarChannel): string {
    return this.availableChannels.find((availableChannel) => availableChannel.id === channel)?.label ?? channel;
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

  private loadCalendarData() {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      reservations: this.loadAllReservations(),
      properties: this.loadAllProperties().pipe(catchError(() => of([] as PropertyResponse[]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ reservations, properties }) => {
          const mappedReservations = reservations
            .filter((reservation) => reservation.status !== 'CANCELLED')
            .map((reservation) => this.mapReservationToCalendarReservation(reservation))
            .filter((reservation): reservation is CalendarReservation => this.isValidCalendarReservation(reservation));

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

  private loadAllReservations(): Observable<ReservationResponse[]> {
    return this.collectAllPages((pageNumber) =>
      this.reservationService.list({
        page: pageNumber,
        size: CalendarMonthComponent.PAGE_SIZE,
        sort: 'startAt,asc',
      })
    );
  }

  private loadAllProperties(): Observable<PropertyResponse[]> {
    return this.collectAllPages((pageNumber) =>
      this.propertyService.list({
        page: pageNumber,
        size: CalendarMonthComponent.PAGE_SIZE,
        sort: 'name,asc',
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
      if (propertyId && propertyName) {
        propertyMap.set(propertyId, propertyName);
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
    return {
      id: reservation.publicId,
      propertyId: this.normalizePropertyId(reservation.propertyPublicId),
      propertyName: String(reservation.propertyName ?? '').trim() || 'Reserva sem propriedade',
      channel: this.normalizeChannel(reservation.channel),
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
      reservation.startDate < reservation.endDate
    );
  }

  private normalizePropertyId(propertyPublicId: string | null | undefined): string {
    return String(propertyPublicId ?? '').trim() || 'UNKNOWN_PROPERTY';
  }

  private normalizeChannel(channel: string | null | undefined): CalendarChannel {
    const normalizedChannel = String(channel ?? '').trim().toUpperCase();

    if (
      normalizedChannel === 'AIRBNB' ||
      normalizedChannel === 'BOOKING' ||
      normalizedChannel === 'VRBO'
    ) {
      return normalizedChannel;
    }

    return 'OTHER';
  }

  private extractDatePart(dateTime: string): string {
    const normalizedValue = String(dateTime ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalizedValue)) {
      return normalizedValue.slice(0, 10);
    }

    const parsedDate = new Date(normalizedValue);
    return Number.isNaN(parsedDate.getTime()) ? '' : this.toISO(parsedDate);
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

  private hasConflictOnDay(bookings: CalendarReservation[]): boolean {
    const bookingsPerProperty = new Map<string, number>();

    bookings.forEach((booking) => {
      bookingsPerProperty.set(booking.propertyId, (bookingsPerProperty.get(booking.propertyId) ?? 0) + 1);
    });

    return Array.from(bookingsPerProperty.values()).some((count) => count > 1);
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
    const weekday = (normalizedDate.getDay() + 6) % 7;
    normalizedDate.setDate(normalizedDate.getDate() - weekday);
    return new Date(
      normalizedDate.getFullYear(),
      normalizedDate.getMonth(),
      normalizedDate.getDate()
    );
  }
}
