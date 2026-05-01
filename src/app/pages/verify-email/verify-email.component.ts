import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiError } from '../../core/api/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
})
export class VerifyEmailComponent implements OnInit {
  readonly loading = signal(true);
  readonly success = signal(false);
  readonly message = signal('Validando confirmacao de e-mail...');
  readonly resending = signal(false);

  readonly resendForm = this.fb.nonNullable.group({
    email: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(255),
    ]),
  });

  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim();
    if (!token) {
      this.loading.set(false);
      this.message.set('Link de confirmacao invalido. Solicite um novo e-mail de confirmacao.');
      return;
    }

    this.authService.confirmEmailVerification({ token }).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.success.set(true);
        this.message.set(response.message);
      },
      error: (error) => {
        this.loading.set(false);
        this.success.set(false);
        this.message.set(this.resolveErrorMessage(error));
      },
    });
  }

  resend(): void {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.resending.set(true);
    this.authService
      .resendEmailVerification({ email: this.resendForm.controls.email.value.trim() })
      .subscribe({
        next: (response) => {
          this.resending.set(false);
          this.message.set(response.message);
        },
        error: () => {
          this.resending.set(false);
          this.message.set('Nao foi possivel reenviar o e-mail agora. Tente novamente em instantes.');
        },
      });
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  hasEmailError(): boolean {
    const control = this.resendForm.controls.email;
    return control.invalid && control.touched;
  }

  private resolveErrorMessage(error: unknown): string {
    const httpError = error as HttpErrorResponse;
    const apiError = httpError?.error as ApiError | undefined;

    if (apiError?.error === 'EMAIL_VERIFICATION_TOKEN_INVALID') {
      return 'Este link e invalido, expirou ou ja foi utilizado. Solicite um novo e-mail de confirmacao.';
    }

    return apiErrorMessage(error, 'Nao foi possivel validar o e-mail.');
  }
}
