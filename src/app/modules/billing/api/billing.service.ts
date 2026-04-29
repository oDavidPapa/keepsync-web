import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiEnvelope } from '../../../core/api/api.models';
import {
  CheckoutSessionResponse,
  CreateCheckoutSessionRequest,
  PortalSessionResponse,
} from './billing.models';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/billing`;

  constructor(private readonly http: HttpClient) {}

  createCheckoutSession(payload: CreateCheckoutSessionRequest): Observable<CheckoutSessionResponse> {
    return this.http
      .post<ApiEnvelope<CheckoutSessionResponse>>(`${this.baseUrl}/checkout-session`, payload)
      .pipe(map((response) => response.data));
  }

  createPortalSession(): Observable<PortalSessionResponse> {
    return this.http
      .post<ApiEnvelope<PortalSessionResponse>>(`${this.baseUrl}/portal-session`, {})
      .pipe(map((response) => response.data));
  }
}
