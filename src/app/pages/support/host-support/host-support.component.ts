import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ConfirmService } from '../../../core/ui/confirm/confirm.service';
import { PageHeaderComponent } from '../../../core/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast/toast.service';
import { apiErrorMessage } from '../../../modules/properties/api/api-error.util';
import {
  PropertyHostGuideResponse,
  PropertyResponse,
  UpdatePropertyHostGuideRequest,
} from '../../../modules/properties/api/property.models';
import { PropertyService } from '../../../modules/properties/api/property.service';

type SaveAction = 'save' | 'publish' | 'unpublish' | null;

@Component({
  selector: 'app-host-support',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './host-support.component.html',
  styleUrl: './host-support.component.scss',
})
export class HostSupportComponent {
  readonly loadingProperties = signal(false);
  readonly loadingGuide = signal(false);
  readonly submitted = signal(false);
  readonly saveAction = signal<SaveAction>(null);

  readonly properties = signal<PropertyResponse[]>([]);
  readonly selectedPropertyPublicId = signal<string | null>(null);
  readonly currentGuide = signal<PropertyHostGuideResponse | null>(null);

  readonly selectedProperty = computed(
    () => this.properties().find((property) => property.publicId === this.selectedPropertyPublicId()) ?? null
  );

  readonly selectedPropertyLabel = computed(() => {
    const selectedProperty = this.selectedProperty();
    if (!selectedProperty) {
      return '-';
    }

    const city = String(selectedProperty.city ?? '').trim();
    const state = String(selectedProperty.state ?? '').trim();
    const local = [city, state].filter((value) => value.length > 0).join(' - ');
    return local ? `${selectedProperty.name} (${local})` : selectedProperty.name;
  });

  readonly propertiesCountLabel = computed(() => {
    const total = this.properties().length;
    return `${total} ${total === 1 ? 'propriedade' : 'propriedades'}`;
  });

  readonly hasProperties = computed(() => this.properties().length > 0);
  readonly isPublished = computed(() => !!this.currentGuide()?.published);

  readonly publicGuideLink = computed(() => {
    const publicSlug = this.currentGuide()?.publicSlug?.trim();
    if (!publicSlug) {
      return '';
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (!origin) {
      return `/guia/${publicSlug}`;
    }

    return `${origin}/guia/${publicSlug}`;
  });

  readonly updatedAtLabel = computed(() => {
    const updatedAt = this.currentGuide()?.updatedAt;
    if (!updatedAt) {
      return '';
    }

    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString('pt-BR');
  });

  readonly canUsePublicLink = computed(() => this.isPublished() && !!this.publicGuideLink());

  readonly saveButtonBusy = computed(() => this.saveAction() === 'save');
  readonly publishToggleBusy = computed(() => this.saveAction() === 'publish' || this.saveAction() === 'unpublish');

  readonly checkInTimeLabel = computed(() => this.formatPropertyTime(this.selectedProperty()?.defaultCheckInTime));
  readonly checkOutTimeLabel = computed(() => this.formatPropertyTime(this.selectedProperty()?.defaultCheckOutTime));

  readonly guideForm = this.fb.nonNullable.group({
    title: this.fb.nonNullable.control('', [Validators.maxLength(120)]),
    welcomeMessage: this.fb.nonNullable.control('', [Validators.maxLength(4000)]),
    wifiName: this.fb.nonNullable.control('', [Validators.maxLength(120)]),
    wifiPassword: this.fb.nonNullable.control('', [Validators.maxLength(120)]),
    checkInInstructions: this.fb.nonNullable.control('', [Validators.maxLength(4000)]),
    checkOutInstructions: this.fb.nonNullable.control('', [Validators.maxLength(4000)]),
    houseRules: this.fb.nonNullable.control('', [Validators.maxLength(4000)]),
    emergencyContact: this.fb.nonNullable.control('', [Validators.maxLength(200)]),
    supportWhatsapp: this.fb.nonNullable.control('', [Validators.maxLength(40)]),
    localTips: this.fb.nonNullable.control('', [Validators.maxLength(4000)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly propertyService: PropertyService,
    private readonly toast: ToastService,
    private readonly confirm: ConfirmService
  ) {
    this.loadProperties();
  }

  loadProperties() {
    this.loadingProperties.set(true);

    this.propertyService
      .list({ page: 0, size: 200, sort: 'name,asc' })
      .subscribe({
        next: (pageResult) => {
          const loadedProperties = pageResult?.content ?? [];
          this.properties.set(loadedProperties);
          this.loadingProperties.set(false);

          if (!loadedProperties.length) {
            this.selectedPropertyPublicId.set(null);
            this.currentGuide.set(null);
            this.resetGuideForm();
            return;
          }

          const currentPropertyPublicId = this.selectedPropertyPublicId();
          const hasCurrentSelection =
            !!currentPropertyPublicId &&
            loadedProperties.some((property) => property.publicId === currentPropertyPublicId);

          const nextSelectedPublicId = hasCurrentSelection
            ? currentPropertyPublicId
            : loadedProperties[0].publicId;

          this.selectedPropertyPublicId.set(nextSelectedPublicId);
          this.loadGuideForProperty(nextSelectedPublicId);
        },
        error: (error) => {
          this.loadingProperties.set(false);
          this.toast.error(apiErrorMessage(error, 'Nao foi possivel carregar as propriedades.'));
        },
      });
  }

  onPropertySelectionChange(propertyPublicId: string) {
    const normalizedPropertyPublicId = (propertyPublicId ?? '').trim();
    if (!normalizedPropertyPublicId || normalizedPropertyPublicId === this.selectedPropertyPublicId()) {
      return;
    }

    this.selectedPropertyPublicId.set(normalizedPropertyPublicId);
    this.loadGuideForProperty(normalizedPropertyPublicId);
  }

  onPublishToggleChange(checked: boolean) {
    const selectedProperty = this.selectedProperty();
    if (!selectedProperty) {
      this.toast.error('Selecione uma propriedade primeiro.');
      return;
    }

    if (checked === this.isPublished()) {
      return;
    }

    const actionLabel = checked ? 'Publicar' : 'Despublicar';

    this.confirm
      .ask({
        title: `${actionLabel} guia`,
        message: `${actionLabel} o guia da propriedade "${selectedProperty.name}"?`,
        confirmText: actionLabel,
        cancelText: 'Cancelar',
        tone: checked ? 'default' : 'danger',
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.persistGuide(checked, checked ? 'publish' : 'unpublish');
      });
  }

  saveGuide() {
    this.persistGuide(this.isPublished(), 'save');
  }

  copyPublicGuideLink() {
    if (!this.canUsePublicLink()) {
      this.toast.error('Publique o guia antes de copiar o link.');
      return;
    }

    this.copyText(this.publicGuideLink(), 'Link publico copiado.');
  }

  openPublicGuideLink() {
    if (!this.canUsePublicLink()) {
      this.toast.error('Publique o guia antes de abrir o link.');
      return;
    }

    window.open(this.publicGuideLink(), '_blank', 'noopener');
  }

  generatePdfFromGuide() {
    if (!this.canUsePublicLink()) {
      this.toast.error('Publique o guia antes de gerar o PDF.');
      return;
    }

    const printLink = `${this.publicGuideLink()}?print=1`;
    window.open(printLink, '_blank', 'noopener');
  }

  onWhatsappInput() {
    const control = this.guideForm.controls.supportWhatsapp;
    control.setValue(this.formatWhatsapp(control.value), { emitEvent: false });
  }

  hasError(controlName: string): boolean {
    const control = this.guideForm.get(controlName);
    if (!control) {
      return false;
    }

    return control.invalid && (control.dirty || control.touched || this.submitted());
  }

  private persistGuide(nextPublishedState: boolean, action: SaveAction) {
    this.submitted.set(true);
    this.guideForm.markAllAsTouched();

    if (this.guideForm.invalid) {
      return;
    }

    const propertyPublicId = this.selectedPropertyPublicId();
    if (!propertyPublicId) {
      this.toast.error('Selecione uma propriedade para salvar o guia.');
      return;
    }

    this.saveAction.set(action);

    this.propertyService
      .updateHostGuide(propertyPublicId, this.buildUpdatePayload(nextPublishedState))
      .subscribe({
        next: (guide) => {
          this.currentGuide.set(guide);
          this.patchGuideForm(guide);
          this.saveAction.set(null);
          this.submitted.set(false);

          if (action === 'publish') {
            this.toast.success('Guia publicado com sucesso.');
            return;
          }

          if (action === 'unpublish') {
            this.toast.success('Guia retirado do ar com sucesso.');
            return;
          }

          this.toast.success('Alteracoes salvas com sucesso.');
        },
        error: (error) => {
          this.saveAction.set(null);
          this.toast.error(apiErrorMessage(error, 'Nao foi possivel salvar o guia da propriedade.'));
        },
      });
  }

  private loadGuideForProperty(propertyPublicId: string) {
    this.loadingGuide.set(true);

    this.propertyService.getHostGuide(propertyPublicId).subscribe({
      next: (guide) => {
        this.currentGuide.set(guide);
        this.patchGuideForm(guide);
        this.loadingGuide.set(false);
        this.submitted.set(false);
      },
      error: (error) => {
        this.currentGuide.set(null);
        this.loadingGuide.set(false);
        this.resetGuideForm();
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel carregar o guia da propriedade.'));
      },
    });
  }

  private patchGuideForm(guide: PropertyHostGuideResponse) {
    this.guideForm.reset({
      title: guide.title ?? '',
      welcomeMessage: guide.welcomeMessage ?? '',
      wifiName: guide.wifiName ?? '',
      wifiPassword: guide.wifiPassword ?? '',
      checkInInstructions: guide.checkInInstructions ?? '',
      checkOutInstructions: guide.checkOutInstructions ?? '',
      houseRules: guide.houseRules ?? '',
      emergencyContact: guide.emergencyContact ?? '',
      supportWhatsapp: this.formatWhatsapp(guide.supportWhatsapp ?? ''),
      localTips: guide.localTips ?? '',
    });

    this.guideForm.markAsPristine();
    this.guideForm.markAsUntouched();
  }

  private resetGuideForm() {
    this.guideForm.reset({
      title: '',
      welcomeMessage: '',
      wifiName: '',
      wifiPassword: '',
      checkInInstructions: '',
      checkOutInstructions: '',
      houseRules: '',
      emergencyContact: '',
      supportWhatsapp: '',
      localTips: '',
    });

    this.guideForm.markAsPristine();
    this.guideForm.markAsUntouched();
    this.submitted.set(false);
  }

  private buildUpdatePayload(published: boolean): UpdatePropertyHostGuideRequest {
    const rawValue = this.guideForm.getRawValue();

    return {
      title: this.normalizeText(rawValue.title),
      welcomeMessage: this.normalizeText(rawValue.welcomeMessage),
      wifiName: this.normalizeText(rawValue.wifiName),
      wifiPassword: this.normalizeText(rawValue.wifiPassword),
      checkInInstructions: this.normalizeText(rawValue.checkInInstructions),
      checkOutInstructions: this.normalizeText(rawValue.checkOutInstructions),
      houseRules: this.normalizeText(rawValue.houseRules),
      emergencyContact: this.normalizeText(rawValue.emergencyContact),
      supportPhone: null,
      supportWhatsapp: this.normalizeText(rawValue.supportWhatsapp),
      localTips: this.normalizeText(rawValue.localTips),
      published,
    };
  }

  private normalizeText(value: string | null | undefined): string | null {
    const normalizedValue = String(value ?? '').trim();
    return normalizedValue ? normalizedValue : null;
  }

  private formatWhatsapp(rawValue: string | null | undefined): string {
    const digitsOnly = String(rawValue ?? '').replace(/\D/g, '').slice(0, 11);

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

  private formatPropertyTime(rawValue?: string | null): string {
    const normalizedValue = String(rawValue ?? '').trim();
    if (!normalizedValue) {
      return '--:--';
    }

    return normalizedValue.length >= 5 ? normalizedValue.slice(0, 5) : normalizedValue;
  }

  private copyText(value: string, successMessage: string): void {
    if (!value?.trim()) {
      this.toast.error('Nada para copiar no momento.');
      return;
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(() => this.toast.success(successMessage))
        .catch(() => this.copyTextFallback(value, successMessage));
      return;
    }

    this.copyTextFallback(value, successMessage);
  }

  private copyTextFallback(value: string, successMessage: string): void {
    const helperTextArea = document.createElement('textarea');
    helperTextArea.value = value;
    helperTextArea.style.position = 'fixed';
    helperTextArea.style.opacity = '0';
    helperTextArea.style.pointerEvents = 'none';
    document.body.appendChild(helperTextArea);
    helperTextArea.focus();
    helperTextArea.select();

    try {
      const copied = document.execCommand('copy');
      if (copied) {
        this.toast.success(successMessage);
      } else {
        this.toast.error('Nao foi possivel copiar automaticamente.');
      }
    } catch {
      this.toast.error('Nao foi possivel copiar automaticamente.');
    } finally {
      document.body.removeChild(helperTextArea);
    }
  }
}
