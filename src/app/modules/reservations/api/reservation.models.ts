import { ApiEnvelope, Page } from '../../../core/api/api.models';

export type ReservationStatus =
  | 'CONFIRMED'
  | 'POSSIBLY_CANCELLED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface ReservationResponse {
  publicId: string;
  propertyPublicId?: string | null;
  propertyName?: string | null;
  channel?: string | null;
  externalUid?: string | null;
  summary?: string | null;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string | null;
  cancelledAt?: string | null;
  possiblyCancelledAt?: string | null;
}

export interface ReservationFinanceResponse {
  guestTotal?: number | null;
  hostPayoutTotal?: number | null;
  totalFees?: number | null;
  cleaningFee?: number | null;
  adjustmentsTotal?: number | null;
  currency?: string | null;
  payoutDate?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UpsertReservationFinanceRequest {
  guestTotal?: number | null;
  hostPayoutTotal?: number | null;
  totalFees?: number | null;
  cleaningFee?: number | null;
  adjustmentsTotal?: number | null;
  currency?: string | null;
  payoutDate?: string | null;
  notes?: string | null;
}

export type ReservationListResponse = ApiEnvelope<Page<ReservationResponse>>;
