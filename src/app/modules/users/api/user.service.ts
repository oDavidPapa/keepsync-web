import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiEnvelope, Page } from '../../../core/api/api.models';
import {
  AcceptTermsRequest,
  ChangeCurrentUserPasswordRequest,
  CurrentUserResponse,
  ResetCurrentUserPasswordResponse,
  UpdateCurrentUserProfileRequest,
  UpdateCurrentUserProfileResponse,
  UserListItemResponse,
} from './user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/users`;
  private readonly adminBaseUrl = `${environment.apiBaseUrl}/v1/admin/users`;

  constructor(private readonly http: HttpClient) {}

  getCurrentUser(): Observable<CurrentUserResponse> {
    return this.http
      .get<ApiEnvelope<CurrentUserResponse>>(`${this.baseUrl}/me`)
      .pipe(map((response) => response.data));
  }

  listUsers(params: { page?: number; size?: number; sort?: string; query?: string; role?: string; status?: string; planCode?: string }): Observable<Page<UserListItemResponse>> {
    const httpParams = new URLSearchParams();
    if (params.page != null) httpParams.set('page', String(params.page));
    if (params.size != null) httpParams.set('size', String(params.size));
    if (params.sort) httpParams.set('sort', params.sort);
    if ((params.query ?? '').trim()) httpParams.set('query', (params.query ?? '').trim());
    if ((params.role ?? '').trim()) httpParams.set('role', (params.role ?? '').trim());
    if ((params.status ?? '').trim()) httpParams.set('status', (params.status ?? '').trim());
    if ((params.planCode ?? '').trim()) httpParams.set('planCode', (params.planCode ?? '').trim());

    return this.http
      .get<ApiEnvelope<Page<UserListItemResponse>>>(`${this.adminBaseUrl}?${httpParams.toString()}`)
      .pipe(map((response) => response.data));
  }

  toggleUserActive(publicId: string): Observable<UserListItemResponse> {
    return this.http
      .patch<ApiEnvelope<UserListItemResponse>>(`${this.adminBaseUrl}/${publicId}/toggle-active`, {})
      .pipe(map((response) => response.data));
  }

  updateCurrentUserProfile(payload: UpdateCurrentUserProfileRequest): Observable<UpdateCurrentUserProfileResponse> {
    return this.http
      .put<ApiEnvelope<UpdateCurrentUserProfileResponse>>(`${this.baseUrl}/me`, payload)
      .pipe(map((response) => response.data));
  }

  changeCurrentUserPassword(payload: ChangeCurrentUserPasswordRequest): Observable<void> {
    return this.http
      .put<ApiEnvelope<void>>(`${this.baseUrl}/me/password`, payload)
      .pipe(map(() => undefined));
  }

  resetCurrentUserPassword(): Observable<ResetCurrentUserPasswordResponse> {
    return this.http
      .post<ApiEnvelope<ResetCurrentUserPasswordResponse>>(`${this.baseUrl}/me/password/reset`, {})
      .pipe(map((response) => response.data));
  }

  acceptCurrentUserTerms(payload: AcceptTermsRequest): Observable<CurrentUserResponse> {
    return this.http
      .post<ApiEnvelope<CurrentUserResponse>>(`${this.baseUrl}/me/terms/accept`, payload)
      .pipe(map((response) => response.data));
  }
}
