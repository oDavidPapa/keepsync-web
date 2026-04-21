import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable, map } from 'rxjs';
import {
  PropertyResponse,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  PropertyHostGuideResponse,
  PublicPropertyHostGuideResponse,
  UpdatePropertyHostGuideRequest,
} from './property.models';
import { ApiEnvelope, Page } from '../../../core/api/api.models';

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/properties`;

  constructor(private readonly http: HttpClient) { }

  list(params: { page?: number; size?: number; sort?: string; query?: string; status?: string; ownerUserPublicId?: string }): Observable<Page<PropertyResponse>> {
    let httpParams = new HttpParams();
    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.size != null) httpParams = httpParams.set('size', params.size);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);

    const queryParam = (params.query ?? '').trim();
    const statusParam = (params.status ?? '').trim();
    const ownerUserPublicIdParam = (params.ownerUserPublicId ?? '').trim();

    if (queryParam) httpParams = httpParams.set('query', queryParam);
    if (statusParam) httpParams = httpParams.set('status', statusParam);
    if (ownerUserPublicIdParam) httpParams = httpParams.set('ownerUserPublicId', ownerUserPublicIdParam);

    return this.http
      .get<ApiEnvelope<Page<PropertyResponse>>>(this.baseUrl, { params: httpParams })
      .pipe(map(r => r.data));
  }

  get(publicId: string): Observable<PropertyResponse> {
    return this.http
      .get<ApiEnvelope<PropertyResponse>>(`${this.baseUrl}/${publicId}`)
      .pipe(map(r => r.data));
  }

  create(request: CreatePropertyRequest): Observable<PropertyResponse> {
    return this.http
      .post<ApiEnvelope<PropertyResponse>>(this.baseUrl, request)
      .pipe(map((response) => response.data));
  }

  update(publicId: string, payload: UpdatePropertyRequest): Observable<PropertyResponse> {
    return this.http
      .put<ApiEnvelope<PropertyResponse>>(`${this.baseUrl}/${publicId}`, payload)
      .pipe(map(r => r.data));
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${publicId}`);
  }

  toggleActive(publicId: string) {
    return this.http.patch<ApiEnvelope<PropertyResponse>>(
      `${this.baseUrl}/${publicId}/toggle-active`, null
    ).pipe(map(r => r.data));
  }

  sync(publicId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${publicId}/sync`, null);
  }

  getHostGuide(publicId: string): Observable<PropertyHostGuideResponse> {
    return this.http
      .get<ApiEnvelope<PropertyHostGuideResponse>>(`${this.baseUrl}/${publicId}/host-guide`)
      .pipe(map((response) => response.data));
  }

  updateHostGuide(publicId: string, payload: UpdatePropertyHostGuideRequest): Observable<PropertyHostGuideResponse> {
    return this.http
      .put<ApiEnvelope<PropertyHostGuideResponse>>(`${this.baseUrl}/${publicId}/host-guide`, payload)
      .pipe(map((response) => response.data));
  }

  getPublicHostGuide(publicSlug: string): Observable<PublicPropertyHostGuideResponse> {
    return this.http
      .get<ApiEnvelope<PublicPropertyHostGuideResponse>>(`${environment.apiBaseUrl}/v1/public/host-guides/${publicSlug}`)
      .pipe(map((response) => response.data));
  }
}
