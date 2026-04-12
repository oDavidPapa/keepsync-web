import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../api/api.models';
import { AuthResponse, LoginRequest } from './auth.models';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/auth`;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly tokenStorage: TokenStorageService
  ) {}

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<ApiEnvelope<AuthResponse>>(`${this.baseUrl}/login`, payload)
      .pipe(
        map((response) => response.data),
        tap((response) => this.tokenStorage.set(response.token))
      );
  }

  logout(redirectTo = '/login'): void {
    this.tokenStorage.clear();
    void this.router.navigateByUrl(redirectTo);
  }
}
