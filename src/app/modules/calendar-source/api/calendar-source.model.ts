export type SyncStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface CalendarSourceResponse {
  publicId: string;
  provider: string;
  providerDisplayName: string;
  providerColor: string;
  icalUrl: string;
  active: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: SyncStatus | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarSourceRequest {
  provider: string;
  icalUrl: string;
}
