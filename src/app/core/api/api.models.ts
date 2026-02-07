export interface ApiEnvelope<T> {
  data: T;
  message: string | null;
  timestamp: string;
  traceId: string;
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
  path: string;
  timestamp: string;
  traceId: string;
  fields: any | null;
}

export interface Page<T> {
  content: T[];
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
  pageable?: any;
  sort?: any;
}
