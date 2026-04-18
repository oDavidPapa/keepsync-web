import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiEnvelope, Page } from '../../../core/api/api.models';
import { NotificationListItemResponse } from './notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/notifications`;

  constructor(private readonly http: HttpClient) {}

  list(params: {
    page?: number;
    size?: number;
    sort?: string;
    userQuery?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<Page<NotificationListItemResponse>> {
    const httpParams = new URLSearchParams();

    if (params.page != null) httpParams.set('page', String(params.page));
    if (params.size != null) httpParams.set('size', String(params.size));
    if (params.sort) httpParams.set('sort', params.sort);
    if ((params.userQuery ?? '').trim()) httpParams.set('userQuery', (params.userQuery ?? '').trim());
    if ((params.type ?? '').trim()) httpParams.set('type', (params.type ?? '').trim());
    if ((params.status ?? '').trim()) httpParams.set('status', (params.status ?? '').trim());
    if ((params.dateFrom ?? '').trim()) httpParams.set('dateFrom', (params.dateFrom ?? '').trim());
    if ((params.dateTo ?? '').trim()) httpParams.set('dateTo', (params.dateTo ?? '').trim());

    return this.http
      .get<ApiEnvelope<Page<NotificationListItemResponse>>>(`${this.baseUrl}?${httpParams.toString()}`)
      .pipe(map((response) => response.data));
  }
}
