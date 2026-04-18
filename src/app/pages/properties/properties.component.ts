import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { CalendarProviderItem } from '../../modules/calendar-providers/api/calendar-provider.models';
import { CalendarProviderService } from '../../modules/calendar-providers/api/calendar-provider.service';
import { ToastService } from '../../core/ui/toast/toast.service';
import { PageHeaderComponent } from '../../core/ui/page-header/page-header.component';
import { TableCardComponent } from '../../core/ui/table-card/table-card.component';
import {
  CalendarSourceResponse,
  CreateCalendarSourceRequest
} from '../../modules/calendar-source/api/calendar-source.model';
import { CalendarSourceService } from '../../modules/calendar-source/api/calendar-source.service';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';
import {
  CreatePropertyRequest,
  PropertyResponse,
  UpdatePropertyRequest
} from '../../modules/properties/api/property.models';
import { PropertyService } from '../../modules/properties/api/property.service';

type ProviderCode = string;

type PropertyBasicInfoForm = FormGroup<{
  name: FormControl<string>;
  addressLine1: FormControl<string>;
  addressLine2: FormControl<string>;
  city: FormControl<string>;
  state: FormControl<string>;
  postalCode: FormControl<string>;
}>;

type SourceForm = FormGroup<{
  publicId: FormControl<string>;
  provider: FormControl<ProviderCode>;
  providerDisplayName: FormControl<string>;
  providerColor: FormControl<string>;
  icalUrl: FormControl<string>;
  active: FormControl<boolean>;
  lastSyncAt: FormControl<string | null>;
  lastSyncStatus: FormControl<CalendarSourceResponse['lastSyncStatus']>;
}>;

type PropertiesForm = FormGroup<{
  basicInfo: PropertyBasicInfoForm;
  sources: FormArray<SourceForm>;
}>;

type NewSourceForm = FormGroup<{
  channel: FormControl<ProviderCode>;
  icalUrl: FormControl<string>;
}>;

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, TableCardComponent],
  templateUrl: './properties.component.html',
  styleUrl: './properties.component.scss',
})
export class PropertiesComponent {
  private static readonly DEFAULT_PROPERTY_TIMEZONE = 'America/Sao_Paulo';
  private static readonly PROVIDER_COLOR_FALLBACK = '#4B708F';

  readonly enabledProviders = signal<CalendarProviderItem[]>([]);
  readonly canAddSources = computed(() => this.enabledProviders().length > 0);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly loading = signal(false);
  readonly togglingSourcePublicId = signal<string | null>(null);

  private readonly propertyPublicId = signal<string | null>(null);
  readonly isEditMode = computed(() => !!this.propertyPublicId());
  readonly isCreateMode = computed(() => !this.propertyPublicId());

  readonly form: PropertiesForm = this.fb.group({
    basicInfo: this.fb.group({
      name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
      addressLine1: this.fb.nonNullable.control('', [Validators.maxLength(160)]),
      addressLine2: this.fb.nonNullable.control('', [Validators.maxLength(160)]),
      city: this.fb.nonNullable.control('', [Validators.maxLength(80)]),
      state: this.fb.nonNullable.control('', [Validators.maxLength(80)]),
      postalCode: this.fb.nonNullable.control('', [Validators.maxLength(20)]),
    }),
    sources: this.fb.array<SourceForm>([]),
  });

  readonly newSourceForm: NewSourceForm = this.fb.group({
    channel: this.fb.nonNullable.control<ProviderCode>('', [Validators.required]),
    icalUrl: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(300)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly propertyService: PropertyService,
    private readonly calendarSourceService: CalendarSourceService,
    private readonly calendarProviderService: CalendarProviderService,
    private readonly toast: ToastService
  ) {
    this.loadEnabledProviders();

    this.route.paramMap.subscribe((params) => {
      const routePublicId = params.get('publicId');

      if (!routePublicId) {
        this.propertyPublicId.set(null);
        this.loading.set(false);
        this.resetFormForCreate();
        return;
      }

      this.propertyPublicId.set(routePublicId);
      this.loadForEdit(routePublicId);
    });
  }

  get sourcesArray(): FormArray<SourceForm> {
    return this.form.controls.sources;
  }

  channelLabel(channelId: string | null | undefined, fallbackDisplayName?: string | null): string {
    if (!channelId) {
      return '-';
    }

    if (fallbackDisplayName && fallbackDisplayName.trim()) {
      return fallbackDisplayName.trim();
    }

    return this.resolveProviderDisplayName(channelId);
  }

  channelColor(channelId: string | null | undefined, fallbackColor?: string | null): string {
    if (fallbackColor && fallbackColor.trim()) {
      return fallbackColor.trim();
    }

    if (!channelId) {
      return PropertiesComponent.PROVIDER_COLOR_FALLBACK;
    }

    return this.resolveProviderColor(channelId);
  }

  sourceStatusLabel(sourceFormGroup: SourceForm): string {
    if (!sourceFormGroup.controls.publicId.value) {
      return 'Pendente';
    }

    return sourceFormGroup.controls.active.value ? 'Ativo' : 'Inativo';
  }

  sourceStatusClass(sourceFormGroup: SourceForm): string {
    if (!sourceFormGroup.controls.publicId.value) {
      return 'warning';
    }

    return sourceFormGroup.controls.active.value ? 'success' : 'warning';
  }

  sourceSyncStatusLabel(sourceFormGroup: SourceForm): string {
    if (!sourceFormGroup.controls.publicId.value) {
      return 'Pendente';
    }

    const lastSyncStatus = sourceFormGroup.controls.lastSyncStatus.value;

    switch (lastSyncStatus) {
      case 'SUCCESS':
        return 'Sucesso';
      case 'FAILED':
        return 'Falha';
      case 'PENDING':
      default:
        return 'Pendente';
    }
  }

  sourceSyncStatusClass(sourceFormGroup: SourceForm): string {
    const lastSyncStatus = sourceFormGroup.controls.lastSyncStatus.value;

    switch (lastSyncStatus) {
      case 'SUCCESS':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'PENDING':
      default:
        return 'warning';
    }
  }

  sourceLastSyncLabel(sourceFormGroup: SourceForm): string {
    if (!sourceFormGroup.controls.publicId.value) {
      return 'Aguardando salvamento';
    }

    const lastSyncAt = sourceFormGroup.controls.lastSyncAt.value;
    if (!lastSyncAt) {
      return 'Ainda nao sincronizado';
    }

    return new Date(lastSyncAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  sourceToggleIcon(sourceFormGroup: SourceForm): string {
    return sourceFormGroup.controls.active.value ? 'pause_circle' : 'play_circle';
  }

  sourceToggleTitle(sourceFormGroup: SourceForm): string {
    return sourceFormGroup.controls.active.value ? 'Inativar canal' : 'Ativar canal';
  }

  submit() {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    const propertyPayload = this.mapFormToPropertyPayload();
    const currentPropertyPublicId = this.propertyPublicId();

    if (!currentPropertyPublicId) {
      this.createPropertyWithSources(propertyPayload);
      return;
    }

    this.updateProperty(currentPropertyPublicId, propertyPayload);
  }

  cancel() {
    this.router.navigate(['/app/properties']);
  }

  addSourceFromDraft() {
    this.newSourceForm.markAllAsTouched();
    if (this.newSourceForm.invalid) {
      return;
    }

    if (!this.canAddSources()) {
      this.toast.error('Nao ha providers habilitados para adicionar novos canais.');
      return;
    }

    const selectedProviderCode = this.normalizeProviderCode(this.newSourceForm.controls.channel.value);
    if (!this.isProviderEnabled(selectedProviderCode)) {
      this.toast.error('Selecione um provider habilitado para adicionar o canal.');
      return;
    }

    const sourceRequest = this.mapNewSourceFormToRequest();
    const currentPropertyPublicId = this.propertyPublicId();

    if (!currentPropertyPublicId) {
      this.sourcesArray.push(this.createDraftSourceGroup(sourceRequest));
      this.newSourceForm.reset({ channel: this.defaultProviderCode(), icalUrl: '' });
      this.toast.success('Canal adicionado e sera salvo junto com a propriedade.');
      return;
    }

    this.calendarSourceService.create(currentPropertyPublicId, sourceRequest).subscribe({
      next: (createdSource) => {
        this.sourcesArray.push(this.createSourceGroup(createdSource));
        this.newSourceForm.reset({ channel: this.defaultProviderCode(), icalUrl: '' });
        this.toast.success('Canal adicionado.');
      },
      error: (error) => {
        this.toast.error('Erro ao adicionar canal.');
        console.error(error);
      }
    });
  }

  removeSource(index: number) {
    const sourceFormGroup = this.sourcesArray.at(index);
    const sourcePublicId = sourceFormGroup.controls.publicId.value;

    if (!sourcePublicId) {
      this.sourcesArray.removeAt(index);
      this.toast.success('Canal removido.');
      return;
    }

    this.calendarSourceService.delete(sourcePublicId).subscribe({
      next: () => {
        this.sourcesArray.removeAt(index);
        this.toast.success('Canal removido.');
      },
      error: (error) => {
        this.toast.error('Erro ao remover canal.');
        console.error(error);
      }
    });
  }

  toggleSourceActive(index: number) {
    const sourceFormGroup = this.sourcesArray.at(index);
    const sourcePublicId = sourceFormGroup.controls.publicId.value;

    if (!sourcePublicId || this.togglingSourcePublicId()) {
      return;
    }

    this.togglingSourcePublicId.set(sourcePublicId);

    this.calendarSourceService.toggleActive(sourcePublicId).subscribe({
      next: (updatedSource) => {
        sourceFormGroup.patchValue({
          active: !!updatedSource.active,
          lastSyncAt: updatedSource.lastSyncAt,
          lastSyncStatus: updatedSource.lastSyncStatus,
        });
        this.toast.success(updatedSource.active ? 'Canal ativado.' : 'Canal inativado.');
        this.togglingSourcePublicId.set(null);
      },
      error: (error) => {
        this.toast.error('Erro ao atualizar o status do canal.');
        this.togglingSourcePublicId.set(null);
        console.error(error);
      }
    });
  }

  hasError(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && (control.dirty || control.touched || this.submitted());
  }

  newSourceError(controlName: 'channel' | 'icalUrl'): boolean {
    const control = this.newSourceForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  private resetFormForCreate() {
    this.submitted.set(false);

    this.form.controls.basicInfo.reset({
      name: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
    });

    this.sourcesArray.clear();
    this.newSourceForm.reset({ channel: this.defaultProviderCode(), icalUrl: '' });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private normalizeProviderCode(value: unknown): string {
    return String(value ?? '').trim().toUpperCase();
  }

  private createSourceGroup(source: CalendarSourceResponse): SourceForm {
    const normalizedProvider = this.normalizeProviderCode((source as { provider?: unknown }).provider);
    const providerDisplayName = this.channelLabel(normalizedProvider, source.providerDisplayName);
    const providerColor = this.channelColor(normalizedProvider, source.providerColor);

    return this.fb.group({
      publicId: this.fb.nonNullable.control(source.publicId),
      provider: this.fb.nonNullable.control(normalizedProvider),
      providerDisplayName: this.fb.nonNullable.control(providerDisplayName),
      providerColor: this.fb.nonNullable.control(providerColor),
      icalUrl: this.fb.nonNullable.control(source.icalUrl),
      active: this.fb.nonNullable.control(!!source.active),
      lastSyncAt: this.fb.control(source.lastSyncAt),
      lastSyncStatus: this.fb.control(source.lastSyncStatus),
    });
  }

  private createDraftSourceGroup(sourceRequest: CreateCalendarSourceRequest): SourceForm {
    const normalizedProvider = this.normalizeProviderCode(sourceRequest.provider);
    const providerDisplayName = this.resolveProviderDisplayName(normalizedProvider);
    const providerColor = this.resolveProviderColor(normalizedProvider);

    return this.fb.group({
      publicId: this.fb.nonNullable.control(''),
      provider: this.fb.nonNullable.control(normalizedProvider),
      providerDisplayName: this.fb.nonNullable.control(providerDisplayName),
      providerColor: this.fb.nonNullable.control(providerColor),
      icalUrl: this.fb.nonNullable.control(sourceRequest.icalUrl),
      active: this.fb.nonNullable.control(false),
      lastSyncAt: this.fb.control<string | null>(null),
      lastSyncStatus: this.fb.control<CalendarSourceResponse['lastSyncStatus']>('PENDING'),
    });
  }

  private loadSources(propertyPublicId: string) {
    this.calendarSourceService.listByProperty(propertyPublicId).subscribe({
      next: (sources) => {
        this.sourcesArray.clear();
        sources.forEach((source) => this.sourcesArray.push(this.createSourceGroup(source)));
      },
      error: (error) => {
        this.toast.error('Erro ao carregar canais e iCal.');
        console.error(error);
      }
    });
  }

  private normalizeOptionalText(value: string): string | undefined {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : undefined;
  }

  private mapFormToPropertyPayload(): CreatePropertyRequest {
    const basicInfoValue = this.form.controls.basicInfo.getRawValue();

    return {
      name: basicInfoValue.name,
      timezone: PropertiesComponent.DEFAULT_PROPERTY_TIMEZONE,
      addressLine1: this.normalizeOptionalText(basicInfoValue.addressLine1),
      addressLine2: this.normalizeOptionalText(basicInfoValue.addressLine2),
      city: this.normalizeOptionalText(basicInfoValue.city),
      state: this.normalizeOptionalText(basicInfoValue.state),
      country: 'BR',
      postalCode: this.normalizeOptionalText(basicInfoValue.postalCode),
    };
  }

  private mapNewSourceFormToRequest(): CreateCalendarSourceRequest {
    const selectedProviderCode = this.normalizeProviderCode(this.newSourceForm.controls.channel.value);

    return {
      provider: selectedProviderCode,
      icalUrl: this.newSourceForm.controls.icalUrl.value.trim(),
    };
  }

  private collectQueuedSourceRequests(): CreateCalendarSourceRequest[] {
    return this.sourcesArray.controls
      .filter((sourceFormGroup) => !sourceFormGroup.controls.publicId.value)
      .map((sourceFormGroup) => ({
        provider: sourceFormGroup.controls.provider.value,
        icalUrl: sourceFormGroup.controls.icalUrl.value,
      }));
  }

  private createPropertyWithSources(propertyPayload: CreatePropertyRequest) {
    const queuedSourceRequests = this.collectQueuedSourceRequests();

    this.propertyService.create(propertyPayload).subscribe({
      next: (createdProperty: PropertyResponse) => {
        this.propertyPublicId.set(createdProperty.publicId);

        if (queuedSourceRequests.length === 0) {
          this.toast.success('Propriedade cadastrada com sucesso.');
          this.saving.set(false);
          this.router.navigate(['/app/properties']);
          return;
        }

        this.persistQueuedSources(createdProperty.publicId, queuedSourceRequests);
      },
      error: (error) => {
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel salvar a propriedade.'));
        this.saving.set(false);
        console.error(error);
      }
    });
  }

  private persistQueuedSources(
    propertyPublicId: string,
    queuedSourceRequests: CreateCalendarSourceRequest[]
  ) {
    forkJoin(
      queuedSourceRequests.map((queuedSourceRequest) =>
        this.calendarSourceService.create(propertyPublicId, queuedSourceRequest)
      )
    ).subscribe({
      next: () => {
        this.toast.success('Propriedade cadastrada com sucesso.');
        this.saving.set(false);
        this.router.navigate(['/app/properties']);
      },
      error: (error) => {
        this.toast.error('A propriedade foi criada, mas nao foi possivel salvar um ou mais canais.');
        this.saving.set(false);
        this.router.navigate(['/app/properties', propertyPublicId, 'edit']);
        console.error(error);
      }
    });
  }

  private updateProperty(propertyPublicId: string, propertyPayload: UpdatePropertyRequest) {
    this.propertyService.update(propertyPublicId, propertyPayload).subscribe({
      next: () => {
        this.toast.success('Propriedade atualizada com sucesso.');
        this.saving.set(false);
        this.router.navigate(['/app/properties']);
      },
      error: (error) => {
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel atualizar a propriedade.'));
        this.saving.set(false);
        console.error(error);
      }
    });
  }

  private loadForEdit(propertyPublicId: string) {
    this.loading.set(true);

    this.propertyService.get(propertyPublicId).subscribe({
      next: (property) => {
        this.applyPropertyToForm(property);
        this.loading.set(false);
        this.loadSources(propertyPublicId);
      },
      error: (error) => {
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel carregar a propriedade.'));
        this.loading.set(false);
        this.router.navigate(['/app/properties']);
      }
    });
  }

  private applyPropertyToForm(property: PropertyResponse) {
    this.submitted.set(false);

    this.form.controls.basicInfo.patchValue({
      name: property.name ?? '',
      addressLine1: property.addressLine1 ?? '',
      addressLine2: property.addressLine2 ?? '',
      city: property.city ?? '',
      state: property.state ?? '',
      postalCode: property.postalCode ?? '',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private loadEnabledProviders() {
    this.calendarProviderService.listEnabledForCurrentUser().subscribe({
      next: (response) => {
        this.enabledProviders.set(response.providers ?? []);
        this.ensureNewSourceSelectedProviderIsEnabled();
        this.refreshSourceProviderPresentation();
      },
      error: (error) => {
        this.enabledProviders.set([]);
        this.newSourceForm.controls.channel.setValue('');
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel carregar os providers habilitados.'));
      },
    });
  }

  private ensureNewSourceSelectedProviderIsEnabled() {
    const selectedProviderCode = this.normalizeProviderCode(this.newSourceForm.controls.channel.value);
    if (selectedProviderCode && this.isProviderEnabled(selectedProviderCode)) {
      return;
    }

    this.newSourceForm.controls.channel.setValue(this.defaultProviderCode());
  }

  private defaultProviderCode(): string {
    return this.enabledProviders()[0]?.code ?? '';
  }

  private isProviderEnabled(providerCode: string): boolean {
    return this.enabledProviders().some((provider) => this.normalizeProviderCode(provider.code) === providerCode);
  }

  private resolveProviderDisplayName(providerCode: string): string {
    const normalizedProviderCode = this.normalizeProviderCode(providerCode);
    const provider = this.enabledProviders()
      .find((enabledProvider) => this.normalizeProviderCode(enabledProvider.code) === normalizedProviderCode);

    return provider?.displayName?.trim() || normalizedProviderCode || '-';
  }

  private resolveProviderColor(providerCode: string): string {
    const normalizedProviderCode = this.normalizeProviderCode(providerCode);
    const provider = this.enabledProviders()
      .find((enabledProvider) => this.normalizeProviderCode(enabledProvider.code) === normalizedProviderCode);

    return provider?.color?.trim() || PropertiesComponent.PROVIDER_COLOR_FALLBACK;
  }

  private refreshSourceProviderPresentation() {
    this.sourcesArray.controls.forEach((sourceFormGroup) => {
      const providerCode = this.normalizeProviderCode(sourceFormGroup.controls.provider.value);
      const providerDisplayName = this.channelLabel(
        providerCode,
        sourceFormGroup.controls.providerDisplayName.value
      );
      const providerColor = this.channelColor(
        providerCode,
        sourceFormGroup.controls.providerColor.value
      );

      sourceFormGroup.patchValue(
        {
          providerDisplayName,
          providerColor,
        },
        { emitEvent: false }
      );
    });
  }
}
