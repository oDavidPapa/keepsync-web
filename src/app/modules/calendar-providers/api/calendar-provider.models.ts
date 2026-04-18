export interface CalendarProviderItem {
  code: string;
  displayName: string;
  color: string;
  active: boolean;
  enabled: boolean;
}

export interface CalendarProviderResponse {
  providers: CalendarProviderItem[];
}

export interface UpdateUserCalendarProvidersRequest {
  providers: Array<{
    code: string;
    enabled: boolean;
  }>;
}
