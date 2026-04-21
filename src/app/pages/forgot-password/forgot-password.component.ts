import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  readonly form = this.fb.nonNullable.group({
    email: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(255),
    ]),
  });

  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly requestCompleted = signal(false);
  readonly lastRequestedEmail = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.requestCompleted.set(false);

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const email = this.form.controls.email.value.trim();
    this.sendForgotPasswordRequest(email, true);
  }

  resendEmail(): void {
    const email = this.lastRequestedEmail();
    if (!email) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.sendForgotPasswordRequest(email, false);
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  hasError(): boolean {
    const emailControl = this.form.controls.email;
    return emailControl.invalid && this.submitted();
  }

  private sendForgotPasswordRequest(email: string, completeRequest: boolean): void {
    this.submitting.set(true);

    this.authService
      .forgotPassword({ email })
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          this.lastRequestedEmail.set(email);
          this.successMessage.set(
            response?.message?.trim() || 'Voce recebera sua senha no email informado.'
          );

          if (completeRequest) {
            this.requestCompleted.set(true);
          }
        },
        error: () => {
          this.submitting.set(false);
          this.errorMessage.set('Nao foi possivel processar sua solicitacao agora.');
        },
      });
  }
}
