import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import {
  CalendarProviderItem,
  UpdateUserCalendarProvidersRequest,
} from '../../modules/calendar-providers/api/calendar-provider.models';
import { CalendarProviderService } from '../../modules/calendar-providers/api/calendar-provider.service';
import { TokenStorageService } from '../../core/auth/token-storage.service';
import { PageHeaderComponent } from '../../core/ui/page-header/page-header.component';
import { ToastService } from '../../core/ui/toast/toast.service';
import { NotificationPreferenceService } from '../../modules/notification-preferences/api/notification-preference.service';
import {
  NotificationPreferenceItem,
  NotificationType,
} from '../../modules/notification-preferences/api/notification-preference.models';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';
import { CurrentUserResponse, UserPlanCode } from '../../modules/users/api/user.models';
import { UserService } from '../../modules/users/api/user.service';
import { resolveEffectivePlanCode } from '../../modules/users/api/user-plan.util';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  readonly notificationSettings: ReadonlyArray<{
    type: NotificationType;
    title: string;
    description: string;
    emailControlName:
      | 'conflictOpenedEmail'
      | 'reservationConfirmedEmail'
      | 'reservationCanceledEmail';
    whatsappControlName:
      | 'conflictOpenedWhatsapp'
      | 'reservationConfirmedWhatsapp'
      | 'reservationCanceledWhatsapp';
  }> = [
    {
      type: 'CONFLICT_OPENED',
      title: 'Conflito detectado',
      description: 'Avise quando surgir um novo conflito de reserva.',
      emailControlName: 'conflictOpenedEmail',
      whatsappControlName: 'conflictOpenedWhatsapp',
    },
    {
      type: 'RESERVATION_CONFIRMED',
      title: 'Reserva confirmada',
      description: 'Avise quando uma nova reserva for confirmada.',
      emailControlName: 'reservationConfirmedEmail',
      whatsappControlName: 'reservationConfirmedWhatsapp',
    },
    {
      type: 'RESERVATION_CANCELED',
      title: 'Reserva cancelada',
      description: 'Avise quando uma reserva for cancelada.',
      emailControlName: 'reservationCanceledEmail',
      whatsappControlName: 'reservationCanceledWhatsapp',
    },
  ];

  readonly loading = signal(false);
  readonly profileSaving = signal(false);
  readonly notificationsSaving = signal(false);
  readonly providersSaving = signal(false);
  readonly passwordSaving = signal(false);
  readonly passwordResetSending = signal(false);
  readonly profileSubmitted = signal(false);
  readonly passwordSubmitted = signal(false);
  readonly currentUser = signal<CurrentUserResponse | null>(null);
  readonly calendarProviders = signal<CalendarProviderItem[]>([]);
  readonly whatsappControlNames = [
    'conflictOpenedWhatsapp',
    'reservationConfirmedWhatsapp',
    'reservationCanceledWhatsapp',
  ] as const;

  readonly profileForm = this.fb.group({
    fullName: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email, Validators.maxLength(255)]),
    phoneNumber: this.fb.nonNullable.control('', [Validators.maxLength(20)]),
  });

  readonly notificationForm = this.fb.group({
    conflictOpenedEmail: this.fb.nonNullable.control(true),
    conflictOpenedWhatsapp: this.fb.nonNullable.control(false),
    reservationConfirmedEmail: this.fb.nonNullable.control(true),
    reservationConfirmedWhatsapp: this.fb.nonNullable.control(false),
    reservationCanceledEmail: this.fb.nonNullable.control(true),
    reservationCanceledWhatsapp: this.fb.nonNullable.control(false),
  });

  readonly passwordForm = this.fb.group({
    currentPassword: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(8), Validators.maxLength(120)]),
    newPassword: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(8), Validators.maxLength(120)]),
    confirmPassword: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(8), Validators.maxLength(120)]),
  });

  readonly effectivePlanCode = computed<UserPlanCode>(() => resolveEffectivePlanCode(this.currentUser()));

  readonly planLabel = computed(() => {
    const currentUser = this.currentUser();
    return currentUser ? this.mapPlanLabel(this.effectivePlanCode()) : '-';
  });

  readonly contractedPlanLabel = computed(() => {
    const currentUser = this.currentUser();
    return currentUser ? this.mapPlanLabel(currentUser.planCode) : '-';
  });

  readonly showContractedPlan = computed(() => {
    const currentUser = this.currentUser();
    if (!currentUser) {
      return false;
    }

    return currentUser.planCode !== this.effectivePlanCode();
  });

  readonly planToneClass = computed(() => {
    const effectivePlanCode = this.effectivePlanCode();
    if (!this.currentUser()) {
      return 'basic';
    }

    switch (effectivePlanCode) {
      case 'FREE':
        return 'free';
      case 'PRO':
        return 'pro';
      case 'BASIC':
      default:
        return 'basic';
    }
  });

  readonly subscriptionDescription = computed(() => {
    const currentUser = this.currentUser();
    if (!currentUser) {
      return 'Carregando plano...';
    }

    const effectivePlanCode = this.effectivePlanCode();
    if (effectivePlanCode === 'FREE') {
      if (currentUser.planCode === 'FREE') {
        return 'Plano gratuito sem expiracao.';
      }

      if (currentUser.subscriptionExpiresAt) {
        return `Seu plano ${this.mapPlanLabel(currentUser.planCode)} expirou em ${this.formatDate(currentUser.subscriptionExpiresAt)}.`;
      }

      return `Seu plano ${this.mapPlanLabel(currentUser.planCode)} nao possui vigencia ativa.`;
    }

    if (!currentUser.subscriptionExpiresAt) {
      return 'Assinatura ativa.';
    }

    return `Expira em ${this.formatDate(currentUser.subscriptionExpiresAt)}.`;
  });

  readonly canUseWhatsAppNotifications = computed(() => {
    return this.effectivePlanCode() !== 'FREE';
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly toast: ToastService,
    private readonly userService: UserService,
    private readonly tokenStorage: TokenStorageService,
    private readonly notificationPreferenceService: NotificationPreferenceService,
    private readonly calendarProviderService: CalendarProviderService
  ) {
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);

    forkJoin({
      currentUser: this.userService.getCurrentUser(),
      notificationPreferences: this.notificationPreferenceService.getGlobalPreferences(),
      calendarProviders: this.calendarProviderService
        .listForCurrentUser()
        .pipe(catchError(() => of({ providers: [] }))),
    }).subscribe({
      next: ({ currentUser, notificationPreferences, calendarProviders }) => {
        this.currentUser.set(currentUser);
        this.applyCurrentUserToForm(currentUser);
        this.applyNotificationPreferencesToForm(notificationPreferences.preferences);
        this.applyWhatsAppAvailabilityByPlan(resolveEffectivePlanCode(currentUser));
        this.calendarProviders.set(calendarProviders.providers ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel carregar as configuracoes.'));
        this.loading.set(false);
      },
    });
  }

  saveProfile() {
    this.profileSubmitted.set(true);
    this.profileForm.markAllAsTouched();

    if (this.profileForm.invalid) {
      return;
    }

    this.profileSaving.set(true);

    this.userService
      .updateCurrentUserProfile({
        fullName: this.profileForm.controls.fullName.value.trim(),
        email: this.profileForm.controls.email.value.trim(),
        phoneNumber: this.normalizeDigits(this.profileForm.controls.phoneNumber.value),
      })
      .subscribe({
        next: (response) => {
          this.currentUser.set(response.user);
          this.applyCurrentUserToForm(response.user);
          this.applyWhatsAppAvailabilityByPlan(resolveEffectivePlanCode(response.user));

          if (response.accessToken) {
            this.tokenStorage.set(response.accessToken);
          }

          this.profileSaving.set(false);
          this.toast.success('Dados da conta atualizados com sucesso.');
        },
        error: (error) => {
          this.profileSaving.set(false);
          this.toast.error(apiErrorMessage(error, 'Nao foi possivel atualizar os dados da conta.'));
        },
      });
  }

  saveNotificationPreferences() {
    this.notificationsSaving.set(true);

    const notificationPreferences: NotificationPreferenceItem[] = this.notificationSettings.flatMap((setting) => [
      {
        type: setting.type,
        channel: 'EMAIL',
        enabled: this.notificationForm.controls[setting.emailControlName].value,
        cooldownMinutes: null,
      },
      {
        type: setting.type,
        channel: 'WHATSAPP',
        enabled: this.canUseWhatsAppNotifications() && this.notificationForm.controls[setting.whatsappControlName].value,
        cooldownMinutes: null,
      },
    ]);

    this.notificationPreferenceService.updatePreferences({
      preferences: notificationPreferences,
    }).subscribe({
      next: () => {
        this.notificationsSaving.set(false);
        this.toast.success('Preferencias de notificacao atualizadas.');
      },
      error: (error) => {
        this.notificationsSaving.set(false);
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel salvar as preferencias de notificacao.'));
      },
    });
  }

  toggleCalendarProvider(providerCode: string) {
    this.calendarProviders.update((providers) =>
      providers.map((provider) => {
        if (provider.code !== providerCode) {
          return provider;
        }

        if (!provider.active) {
          return { ...provider, enabled: false };
        }

        return { ...provider, enabled: !provider.enabled };
      })
    );
  }

  saveCalendarProviders() {
    this.providersSaving.set(true);

    const request: UpdateUserCalendarProvidersRequest = {
      providers: this.calendarProviders().map((provider) => ({
        code: provider.code,
        enabled: provider.enabled,
      })),
    };

    this.calendarProviderService.updateCurrentUserProviders(request).subscribe({
      next: () => {
        this.providersSaving.set(false);
        this.toast.success('Providers atualizados com sucesso.');
      },
      error: (error) => {
        this.providersSaving.set(false);
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel atualizar os providers.'));
      },
    });
  }

  changePassword() {
    this.passwordSubmitted.set(true);
    this.passwordForm.markAllAsTouched();

    if (this.passwordForm.invalid || !this.passwordConfirmationMatches()) {
      if (!this.passwordConfirmationMatches()) {
        this.toast.error('A confirmacao da nova senha precisa ser igual a nova senha.');
      }
      return;
    }

    this.passwordSaving.set(true);

    this.userService.changeCurrentUserPassword({
      currentPassword: this.passwordForm.controls.currentPassword.value,
      newPassword: this.passwordForm.controls.newPassword.value,
    }).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.passwordForm.reset({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        this.passwordForm.markAsPristine();
        this.passwordForm.markAsUntouched();
        this.passwordSubmitted.set(false);
        this.toast.success('Senha atualizada com sucesso.');
      },
      error: (error) => {
        this.passwordSaving.set(false);
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel atualizar a senha.'));
      },
    });
  }

  sendPasswordReset() {
    this.passwordResetSending.set(true);

    this.userService.resetCurrentUserPassword().subscribe({
      next: (response) => {
        this.passwordResetSending.set(false);
        this.toast.success(`Uma senha temporaria foi enviada para ${response.maskedEmail}.`);
      },
      error: (error) => {
        this.passwordResetSending.set(false);
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel enviar a nova senha por email.'));
      },
    });
  }

  onPhoneInput() {
    const phoneControl = this.profileForm.controls.phoneNumber;
    phoneControl.setValue(this.formatPhone(phoneControl.value), { emitEvent: false });
  }

  hasProfileError(controlName: keyof typeof this.profileForm.controls) {
    const control = this.profileForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched || this.profileSubmitted());
  }

  hasPasswordError(controlName: keyof typeof this.passwordForm.controls) {
    const control = this.passwordForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched || this.passwordSubmitted());
  }

  passwordConfirmationMatches() {
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    return newPassword === confirmPassword;
  }

  private applyCurrentUserToForm(currentUser: CurrentUserResponse) {
    this.profileForm.patchValue({
      fullName: currentUser.fullName ?? '',
      email: currentUser.email ?? '',
      phoneNumber: this.formatPhone(currentUser.phoneNumber ?? ''),
    });

    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
    this.profileSubmitted.set(false);
  }

  private applyNotificationPreferencesToForm(preferences: NotificationPreferenceItem[]) {
    const preferencesByKey = new Map(
      preferences.map((preference) => [`${preference.type}_${preference.channel}`, preference.enabled])
    );

    this.notificationForm.patchValue({
      conflictOpenedEmail: preferencesByKey.get('CONFLICT_OPENED_EMAIL') ?? true,
      conflictOpenedWhatsapp: preferencesByKey.get('CONFLICT_OPENED_WHATSAPP') ?? true,
      reservationConfirmedEmail: preferencesByKey.get('RESERVATION_CONFIRMED_EMAIL') ?? true,
      reservationConfirmedWhatsapp: preferencesByKey.get('RESERVATION_CONFIRMED_WHATSAPP') ?? true,
      reservationCanceledEmail: preferencesByKey.get('RESERVATION_CANCELED_EMAIL') ?? false,
      reservationCanceledWhatsapp: preferencesByKey.get('RESERVATION_CANCELED_WHATSAPP') ?? false,
    });
  }

  private applyWhatsAppAvailabilityByPlan(planCode: UserPlanCode) {
    const canUseWhatsApp = planCode !== 'FREE';

    this.whatsappControlNames.forEach((controlName) => {
      const control = this.notificationForm.controls[controlName];

      if (canUseWhatsApp) {
        control.enable({ emitEvent: false });
        return;
      }

      control.setValue(false, { emitEvent: false });
      control.disable({ emitEvent: false });
    });
  }

  private mapPlanLabel(planCode: UserPlanCode) {
    switch (planCode) {
      case 'FREE':
        return 'Free';
      case 'BASIC':
        return 'Basico';
      case 'PRO':
        return 'Pro';
      default:
        return planCode;
    }
  }

  private normalizeDigits(value: string) {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly ? digitsOnly : null;
  }

  private formatPhone(value: string) {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 11);

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

  private formatDate(value: string) {
    return new Date(value).toLocaleDateString('pt-BR');
  }
}
