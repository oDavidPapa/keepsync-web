export interface DashboardPeriodResponse {
  monthReference: string;
  startAt: string;
  endAt: string;
}

export interface DashboardKpiResponse {
  valueToReceiveTotal: number;
  guestTotal: number;
  confirmedReservations: number;
  reservationsInPeriod: number;
  openConflicts: number;
}

export interface DashboardChannelSummaryResponse {
  channel: string;
  reservationsCount: number;
  valueToReceiveTotal: number;
}

export interface DashboardPropertySummaryResponse {
  propertyPublicId: string | null;
  propertyName: string;
  confirmedReservations: number;
  valueToReceiveTotal: number;
}

export interface DashboardPropertyOccupancyResponse {
  propertyPublicId: string | null;
  propertyName: string;
  monthReference: string;
  bookedDays: number;
  monthDays: number;
  occupancyRatePercent: number;
}

export interface DashboardUpcomingReservationResponse {
  reservationPublicId: string;
  propertyPublicId: string | null;
  propertyName: string;
  ownerDisplay: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  channel: string | null;
  status: 'CONFIRMED' | 'POSSIBLY_CANCELLED' | 'CANCELLED' | 'COMPLETED';
  startAt: string;
  endAt: string;
}

export interface DashboardSummaryResponse {
  period: DashboardPeriodResponse;
  kpis: DashboardKpiResponse;
  channels: DashboardChannelSummaryResponse[];
  propertyValues: DashboardPropertySummaryResponse[];
  occupancyByProperty: DashboardPropertyOccupancyResponse[];
  upcomingCheckIns: DashboardUpcomingReservationResponse[];
  upcomingCheckOuts: DashboardUpcomingReservationResponse[];
}
