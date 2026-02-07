
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

  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;

  sources: PropertySourceRequest[];
}

export interface UpdatePropertyRequest {
  name?: string | null;
  timezone?: string | null;

  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;

  sources?: PropertySourceRequest[];
}
