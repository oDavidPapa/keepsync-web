export type NotificationType =
  | 'CONFLICT_OPENED'
  | 'CONFLICT_RESOLVED'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELED';

export type NotificationChannel = 'EMAIL' | 'WHATSAPP';

export interface NotificationPreferenceItem {
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
  cooldownMinutes?: number | null;
}

export interface NotificationPreferenceResponse {
  preferences: NotificationPreferenceItem[];
}

export interface NotificationPreferenceRequest {
  preferences: NotificationPreferenceItem[];
}
