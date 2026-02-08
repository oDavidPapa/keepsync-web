export type CalendarProvider = 'AIRBNB' | 'VRBO' | 'BOOKING' | 'OTHER';

export type SyncStatus = 'OK' | 'ERROR' | 'RUNNING' | 'NEVER';

export interface CalendarSourceResponse {
  publicId: string;
  provider: CalendarProvider;
  icalUrl: string;
  active: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: SyncStatus | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarSourceRequest {
  provider: CalendarProvider;
  icalUrl: string;
}
