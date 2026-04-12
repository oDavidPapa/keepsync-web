import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { TokenStorageService } from './token-storage.service';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly tokenStorage: TokenStorageService,
    private readonly router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApiCall = req.url.startsWith(environment.apiBaseUrl);
    if (!isApiCall) return next.handle(req);

    if (req.headers.has('Authorization')) return next.handle(req);

    const authRequest = this.withAccessToken(req);

    return next.handle(authRequest).pipe(
      catchError((error: unknown) => {
        if (this.shouldRedirectToLogin(req.url, error)) {
          this.tokenStorage.clear();
          void this.router.navigate(['/login']);
        }

        return throwError(() => error);
      })
    );
  }

  private withAccessToken(req: HttpRequest<any>): HttpRequest<any> {
    const token = this.tokenStorage.getValidToken();
    if (!token) {
      return req;
    }

    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private shouldRedirectToLogin(url: string, error: unknown): boolean {
    const httpError = error as HttpErrorResponse;
    const isUnauthorized = httpError.status === 401;
    const isLoginRequest = url.startsWith(`${environment.apiBaseUrl}/v1/auth/login`);

    return isUnauthorized && !isLoginRequest;
  }
}
