import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiEnvelope } from '../../../core/api/api.models';
import {
  NotificationPreferenceRequest,
  NotificationPreferenceResponse,
} from './notification-preference.models';

@Injectable({ providedIn: 'root' })
export class NotificationPreferenceService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/notification-preferences`;

  constructor(private readonly http: HttpClient) {}

  getGlobalPreferences(): Observable<NotificationPreferenceResponse> {
    return this.http
      .get<ApiEnvelope<NotificationPreferenceResponse>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  getPropertyPreferences(propertyPublicId: string): Observable<NotificationPreferenceResponse> {
    const params = new HttpParams().set('propertyPublicId', propertyPublicId);
    return this.http
      .get<ApiEnvelope<NotificationPreferenceResponse>>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  updatePreferences(payload: NotificationPreferenceRequest): Observable<void> {
    return this.http
      .put<ApiEnvelope<void>>(this.baseUrl, payload)
      .pipe(map(() => undefined));
  }
}
