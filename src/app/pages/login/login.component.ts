import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiError } from '../../core/api/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  readonly form = this.fb.nonNullable.group({
    email: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(255),
    ]),
    password: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(120),
    ]),
    rememberMe: this.fb.nonNullable.control(true),
  });

  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly resendingVerification = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly helperMessage = signal<string | null>(null);
  readonly canResendVerification = signal(false);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);
    this.helperMessage.set(null);
    this.canResendVerification.set(false);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);

    this.authService
      .login({
        email: this.form.controls.email.value.trim(),
        password: this.form.controls.password.value,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl(this.resolveRedirectUrl());
        },
        error: (error) => {
          this.submitting.set(false);
          this.errorMessage.set(this.resolveErrorMessage(error));
        },
      });
  }

  resendVerificationEmail(): void {
    const email = this.form.controls.email.value.trim();
    if (!email) {
      this.errorMessage.set('Informe o e-mail para reenviar a confirmacao.');
      return;
    }

    this.resendingVerification.set(true);
    this.helperMessage.set(null);

    this.authService
      .resendEmailVerification({ email })
      .subscribe({
        next: (response) => {
          this.resendingVerification.set(false);
          this.canResendVerification.set(false);
          this.helperMessage.set(response.message);
        },
        error: () => {
          this.resendingVerification.set(false);
          this.helperMessage.set('Nao foi possivel reenviar agora. Tente novamente em instantes.');
        },
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  forgotPassword(): void {
    void this.router.navigate(['/forgot-password']);
  }

  requestAccess(): void {
    void this.router.navigate(['/register']);
  }

  hasError(controlName: 'email' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && this.submitted();
  }

  private resolveRedirectUrl(): string {
    const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo')?.trim();
    return redirectTo && redirectTo.startsWith('/app') ? redirectTo : '/app/dashboard';
  }

  private resolveErrorMessage(error: unknown): string {
    const httpError = error as HttpErrorResponse;
    const apiError = httpError?.error as ApiError | undefined;
    if (httpError?.status === 401 || apiError?.error === 'INVALID_CREDENTIALS' || apiError?.error === 'EMAIL_NOT_VERIFIED') {
      this.canResendVerification.set(true);
      return 'Nao foi possivel autenticar com os dados informados.';
    }

    return apiErrorMessage(error, 'Nao foi possivel realizar o login.');
  }
}
