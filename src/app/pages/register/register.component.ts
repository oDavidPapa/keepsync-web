import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiError } from '../../core/api/api.models';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  readonly form = this.fb.nonNullable.group({
    fullName: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(120),
    ]),
    email: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(255),
    ]),
    phoneNumber: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(16),
    ]),
    password: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(120),
    ]),
    confirmPassword: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(120),
    ]),
  });

  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.form.invalid || !this.passwordsMatch()) {
      return;
    }

    this.submitting.set(true);

    this.authService
      .register({
        fullName: this.form.controls.fullName.value.trim(),
        email: this.form.controls.email.value.trim(),
        phoneNumber: this.normalizeDigits(this.form.controls.phoneNumber.value),
        password: this.form.controls.password.value,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl('/register/success');
        },
        error: (error) => {
          this.submitting.set(false);
          this.errorMessage.set(this.resolveErrorMessage(error));
        },
      });
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  onPhoneInput(): void {
    const phoneControl = this.form.controls.phoneNumber;
    phoneControl.setValue(this.formatPhone(phoneControl.value), { emitEvent: false });
  }

  hasError(controlName: 'fullName' | 'email' | 'phoneNumber' | 'password' | 'confirmPassword'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && this.submitted();
  }

  passwordsMatch(): boolean {
    return this.form.controls.password.value === this.form.controls.confirmPassword.value;
  }

  showPasswordMismatch(): boolean {
    return this.submitted() && !this.passwordsMatch();
  }

  private resolveErrorMessage(error: unknown): string {
    const httpError = error as HttpErrorResponse;
    const apiError = httpError?.error as ApiError | undefined;
    const rawStringError = typeof httpError?.error === 'string' ? httpError.error : '';
    const normalizedApiMessage = (apiError?.message ?? '').trim().toLowerCase();
    const normalizedRawStringError = rawStringError.trim().toLowerCase();

    if (
      apiError?.error === 'EMAIL_ALREADY_REGISTERED'
      || normalizedApiMessage.includes('email already registered')
      || normalizedApiMessage.includes('ja existe uma conta com este e-mail')
      || normalizedRawStringError.includes('email already registered')
      || normalizedRawStringError.includes('ja existe uma conta com este e-mail')
    ) {
      return 'Este e-mail ja pode estar em uso. Se voce ja tem uma conta, tente fazer login ou recuperar a senha.';
    }

    if (
      normalizedApiMessage === 'unexpected error'
      || normalizedRawStringError === 'unexpected error'
      || normalizedApiMessage.includes('nao foi possivel enviar o email')
      || normalizedRawStringError.includes('nao foi possivel enviar o email')
    ) {
      return 'Nao foi possivel concluir seu cadastro agora. Tente novamente em instantes ou use outro e-mail.';
    }

    return apiErrorMessage(error, 'Nao foi possivel concluir o cadastro.');
  }

  private normalizeDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  private formatPhone(value: string): string {
    const digitsOnly = this.normalizeDigits(value).slice(0, 11);

    if (!digitsOnly) {
      return '';
    }

    if (digitsOnly.length <= 2) {
      return `(${digitsOnly}`;
    }

    if (digitsOnly.length <= 6) {
      return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2)}`;
    }

    if (digitsOnly.length <= 10) {
      return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6)}`;
    }

    return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 7)}-${digitsOnly.slice(7)}`;
  }

}
