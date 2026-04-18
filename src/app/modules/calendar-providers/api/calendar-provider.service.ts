import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiEnvelope } from '../../../core/api/api.models';
import {
  CalendarProviderResponse,
  UpdateUserCalendarProvidersRequest,
} from './calendar-provider.models';

@Injectable({ providedIn: 'root' })
export class CalendarProviderService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  listForCurrentUser(ownerUserPublicId?: string) {
    let params = new HttpParams();
    const ownerUserPublicIdParam = (ownerUserPublicId ?? '').trim();
    if (ownerUserPublicIdParam) {
      params = params.set('ownerUserPublicId', ownerUserPublicIdParam);
    }

    return this.http
      .get<ApiEnvelope<CalendarProviderResponse>>(`${this.baseUrl}/v1/calendar-providers`, { params })
      .pipe(map((response) => response.data));
  }

  listEnabledForCurrentUser(ownerUserPublicId?: string) {
    let params = new HttpParams();
    const ownerUserPublicIdParam = (ownerUserPublicId ?? '').trim();
    if (ownerUserPublicIdParam) {
      params = params.set('ownerUserPublicId', ownerUserPublicIdParam);
    }

    return this.http
      .get<ApiEnvelope<CalendarProviderResponse>>(`${this.baseUrl}/v1/calendar-providers/enabled`, { params })
      .pipe(map((response) => response.data));
  }

  updateCurrentUserProviders(request: UpdateUserCalendarProvidersRequest) {
    return this.http
      .put<ApiEnvelope<void>>(`${this.baseUrl}/v1/calendar-providers`, request)
      .pipe(map(() => undefined));
  }
}
