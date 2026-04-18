export type NotificationType =
  | 'CONFLICT_OPENED'
  | 'CONFLICT_RESOLVED'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELED';

export type NotificationChannel = 'EMAIL' | 'WHATSAPP';

export type NotificationStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'SKIPPED';

export interface NotificationListItemResponse {
  id: number;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  attempts: number;
  ownerUserId: number;
  ownerUserPublicId?: string | null;
  ownerUserFullName?: string | null;
  ownerUserEmail?: string | null;
  propertyId?: number | null;
  conflictId?: number | null;
  reservationId?: number | null;
  createdAt: string;
  processingAt?: string | null;
  sentAt?: string | null;
  lastError?: string | null;
}
