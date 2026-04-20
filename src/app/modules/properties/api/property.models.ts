import { ApiEnvelope, Page } from "../../../core/api/api.models";

export interface PropertyResponse {
  publicId: string;
  name: string;
  timezone: string;

  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  defaultCheckInTime?: string | null;
  defaultCheckOutTime?: string | null;
  ownerDisplay?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  canDelete?: boolean;
  
  active: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface PropertySourceRequest {
  channel: string;
  icalUrl: string;
}

export interface CreatePropertyRequest {
  name: string;
  timezone: string;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;

  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;

  sources?: PropertySourceRequest[];
}

export interface UpdatePropertyRequest {
  name?: string | null;
  timezone?: string | null;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;

  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;

  sources?: PropertySourceRequest[];
}


export type PropertyListResponse = ApiEnvelope<Page<PropertyResponse>>;
export type PropertyGetResponse = ApiEnvelope<PropertyResponse>;
export type PropertyCreateResponse = ApiEnvelope<PropertyResponse>;
