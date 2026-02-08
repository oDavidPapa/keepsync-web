import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { CalendarSourceResponse, CreateCalendarSourceRequest } from './calendar-source.model';
import { ApiEnvelope } from '../../../core/api/api.models';

@Injectable({ providedIn: 'root' })
export class CalendarSourceService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  listByProperty(propertyPublicId: string) {
    return this.http
      .get<ApiEnvelope<CalendarSourceResponse[]>>(
        `${this.baseUrl}/v1/properties/${propertyPublicId}/calendar-sources`
      )
      .pipe(map(r => r.data));
  }

  create(propertyPublicId: string, request: CreateCalendarSourceRequest) {
    return this.http
      .post<ApiEnvelope<CalendarSourceResponse>>(
        `${this.baseUrl}/v1/properties/${propertyPublicId}/calendar-sources`,
        request
      )
      .pipe(map(r => r.data));
  }

  delete(publicId: string) {
    return this.http.delete<void>(
      `${this.baseUrl}/v1/calendar-sources/${publicId}`
    );
  }
}
