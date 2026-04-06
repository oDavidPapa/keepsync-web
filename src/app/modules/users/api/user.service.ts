import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiEnvelope } from '../../../core/api/api.models';
import {
  ChangeCurrentUserPasswordRequest,
  CurrentUserResponse,
  ResetCurrentUserPasswordResponse,
  UpdateCurrentUserProfileRequest,
  UpdateCurrentUserProfileResponse,
} from './user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/users`;

  constructor(private readonly http: HttpClient) {}

  getCurrentUser(): Observable<CurrentUserResponse> {
    return this.http
      .get<ApiEnvelope<CurrentUserResponse>>(`${this.baseUrl}/me`)
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
}
