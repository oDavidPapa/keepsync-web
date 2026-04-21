import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PageHeaderComponent } from '../../../core/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast/toast.service';
import { apiErrorMessage } from '../../../modules/properties/api/api-error.util';
import { SupportService } from '../../../modules/support/api/support.service';

@Component({
  selector: 'app-account-deletion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './account-deletion.component.html',
  styleUrl: './account-deletion.component.scss',
})
export class AccountDeletionComponent {
  private static readonly CONFIRMATION_PHRASE = 'Excluir Conta';

  readonly loadingContactInfo = signal(false);
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly requestSent = signal(false);
  readonly contactEmail = signal('support@keepsync.local');
  readonly supportMailto = computed(() => `mailto:${this.contactEmail()}`);

  readonly form = this.fb.nonNullable.group({
    reason: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(2000)]),
    confirmed: this.fb.nonNullable.control(false, [Validators.requiredTrue]),
    typedConfirmation: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(30)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly supportService: SupportService,
    private readonly toast: ToastService
  ) {
    this.loadContactInfo();
  }

  sendRequest() {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid || this.hasTypedConfirmationError()) {
      return;
    }

    this.submitting.set(true);

    this.supportService.sendAccountDeletionRequest({
      reason: this.form.controls.reason.value.trim(),
      confirmed: this.form.controls.confirmed.value,
      typedConfirmation: this.form.controls.typedConfirmation.value.trim(),
    }).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.requestSent.set(true);
        this.form.disable({ emitEvent: false });
        this.toast.success(response.message || 'Solicitacao enviada com sucesso.');
      },
      error: (error) => {
        this.submitting.set(false);
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel enviar sua solicitacao de exclusao.'));
      },
    });
  }

  hasReasonError(): boolean {
    const control = this.form.controls.reason;
    return control.invalid && (control.dirty || control.touched || this.submitted());
  }

  hasConfirmationError(): boolean {
    const control = this.form.controls.confirmed;
    return control.invalid && (control.dirty || control.touched || this.submitted());
  }

  hasTypedConfirmationError(): boolean {
    const control = this.form.controls.typedConfirmation;
    const shouldShow = control.invalid || (this.submitted() && !this.isTypedConfirmationMatch());
    return shouldShow && (control.dirty || control.touched || this.submitted());
  }

  typedConfirmationHint(): string {
    return AccountDeletionComponent.CONFIRMATION_PHRASE;
  }

  private isTypedConfirmationMatch(): boolean {
    return this.form.controls.typedConfirmation.value.trim() === AccountDeletionComponent.CONFIRMATION_PHRASE;
  }

  private loadContactInfo() {
    this.loadingContactInfo.set(true);
    this.supportService.getContactInfo().subscribe({
      next: (response) => {
        const email = String(response?.contactEmail ?? '').trim();
        this.contactEmail.set(email || 'support@keepsync.local');
        this.loadingContactInfo.set(false);
      },
      error: () => {
        this.loadingContactInfo.set(false);
      },
    });
  }
}
