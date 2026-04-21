import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PageHeaderComponent } from '../../../core/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast/toast.service';
import { apiErrorMessage } from '../../../modules/properties/api/api-error.util';
import { SupportService } from '../../../modules/support/api/support.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  readonly loadingContactInfo = signal(false);
  readonly sending = signal(false);
  readonly submitted = signal(false);
  readonly contactEmail = signal('support@keepsync.local');

  readonly supportMailto = computed(() => `mailto:${this.contactEmail()}`);

  readonly form = this.fb.nonNullable.group({
    subject: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    message: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(2000)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly supportService: SupportService,
    private readonly toast: ToastService
  ) {
    this.loadContactInfo();
  }

  send() {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.sending.set(true);

    this.supportService.sendContactRequest({
      subject: this.form.controls.subject.value.trim(),
      message: this.form.controls.message.value.trim(),
    }).subscribe({
      next: (response) => {
        this.sending.set(false);
        this.form.reset({
          subject: '',
          message: '',
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.submitted.set(false);
        this.toast.success(response.message || 'Mensagem enviada com sucesso.');
      },
      error: (error) => {
        this.sending.set(false);
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel enviar sua mensagem.'));
      },
    });
  }

  hasError(controlName: 'subject' | 'message'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched || this.submitted());
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
