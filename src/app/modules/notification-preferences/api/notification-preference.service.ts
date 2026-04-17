import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  updatePreferences(payload: NotificationPreferenceRequest): Observable<void> {
    return this.http
      .put<ApiEnvelope<void>>(this.baseUrl, payload)
      .pipe(map(() => undefined));
  }
}
