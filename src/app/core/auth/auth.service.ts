import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../api/api.models';
import {
  AuthResponse,
  EmailVerificationConfirmRequest,
  EmailVerificationResendRequest,
  EmailVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  RegisterRequest,
} from './auth.models';
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

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<ApiEnvelope<AuthResponse>>(`${this.baseUrl}/register`, payload)
      .pipe(map((response) => response.data));
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.http
      .post<ApiEnvelope<ForgotPasswordResponse>>(`${this.baseUrl}/forgot-password`, payload)
      .pipe(map((response) => response.data));
  }

  confirmEmailVerification(payload: EmailVerificationConfirmRequest): Observable<EmailVerificationResponse> {
    return this.http
      .post<ApiEnvelope<EmailVerificationResponse>>(`${this.baseUrl}/email-verification/confirm`, payload)
      .pipe(map((response) => response.data));
  }

  resendEmailVerification(payload: EmailVerificationResendRequest): Observable<EmailVerificationResponse> {
    return this.http
      .post<ApiEnvelope<EmailVerificationResponse>>(`${this.baseUrl}/email-verification/resend`, payload)
      .pipe(map((response) => response.data));
  }

  logout(redirectTo = '/login'): void {
    this.tokenStorage.clear();
    void this.router.navigateByUrl(redirectTo);
  }
}
