import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiEnvelope, Page } from '../../../core/api/api.models';
import {
  ReservationFinanceResponse,
  ReservationResponse,
  UpsertReservationFinanceRequest,
} from './reservation.models';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/reservations`;

  constructor(private readonly http: HttpClient) {}

  list(params: {
    page?: number;
    size?: number;
    sort?: string;
    query?: string;
    status?: string;
    includeInactiveProperties?: boolean;
    onlyConflicts?: boolean;
    ownerUserPublicId?: string;
    periodStart?: string;
    periodEnd?: string;
  }): Observable<Page<ReservationResponse>> {
    let httpParams = new HttpParams();

    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.size != null) httpParams = httpParams.set('size', params.size);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);

    const queryParam = (params.query ?? '').trim();
    const statusParam = (params.status ?? '').trim();
    const includeInactivePropertiesParam = params.includeInactiveProperties === true;
    const onlyConflictsParam = params.onlyConflicts === true;
    const ownerUserPublicIdParam = (params.ownerUserPublicId ?? '').trim();
    const periodStartParam = (params.periodStart ?? '').trim();
    const periodEndParam = (params.periodEnd ?? '').trim();

    if (queryParam) httpParams = httpParams.set('query', queryParam);
    if (statusParam) httpParams = httpParams.set('status', statusParam);
    if (includeInactivePropertiesParam) httpParams = httpParams.set('includeInactiveProperties', 'true');
    if (onlyConflictsParam) httpParams = httpParams.set('onlyConflicts', 'true');
    if (ownerUserPublicIdParam) httpParams = httpParams.set('ownerUserPublicId', ownerUserPublicIdParam);
    if (periodStartParam) httpParams = httpParams.set('periodStart', periodStartParam);
    if (periodEndParam) httpParams = httpParams.set('periodEnd', periodEndParam);

    return this.http
      .get<ApiEnvelope<Page<ReservationResponse>>>(this.baseUrl, { params: httpParams })
      .pipe(map((response) => response.data));
  }

  get(publicId: string): Observable<ReservationResponse> {
    return this.http
      .get<ApiEnvelope<ReservationResponse>>(`${this.baseUrl}/${publicId}`)
      .pipe(map((response) => response.data));
  }

  getFinance(publicId: string): Observable<ReservationFinanceResponse> {
    return this.http
      .get<ApiEnvelope<ReservationFinanceResponse>>(`${this.baseUrl}/${publicId}/finance`)
      .pipe(map((response) => response.data));
  }

  upsertFinance(publicId: string, payload: UpsertReservationFinanceRequest): Observable<ReservationFinanceResponse> {
    return this.http
      .put<ApiEnvelope<ReservationFinanceResponse>>(`${this.baseUrl}/${publicId}/finance`, payload)
      .pipe(map((response) => response.data));
  }
}
