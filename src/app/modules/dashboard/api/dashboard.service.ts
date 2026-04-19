import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiEnvelope } from '../../../core/api/api.models';
import { DashboardSummaryResponse } from './dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/dashboard`;

  constructor(private readonly http: HttpClient) {}

  getSummary(params: {
    month?: string;
    propertyPublicId?: string;
    channel?: string;
    ownerUserPublicId?: string;
  }): Observable<DashboardSummaryResponse> {
    let httpParams = new HttpParams();

    const month = (params.month ?? '').trim();
    const propertyPublicId = (params.propertyPublicId ?? '').trim();
    const channel = (params.channel ?? '').trim();
    const ownerUserPublicId = (params.ownerUserPublicId ?? '').trim();

    if (month) {
      httpParams = httpParams.set('month', month);
    }
    if (propertyPublicId) {
      httpParams = httpParams.set('propertyPublicId', propertyPublicId);
    }
    if (channel) {
      httpParams = httpParams.set('channel', channel);
    }
    if (ownerUserPublicId) {
      httpParams = httpParams.set('ownerUserPublicId', ownerUserPublicId);
    }

    return this.http
      .get<ApiEnvelope<DashboardSummaryResponse>>(`${this.baseUrl}/summary`, { params: httpParams })
      .pipe(map((response) => response.data));
  }
}
