import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { PropertyService } from '../../modules/properties/api/property.service';
import { ToastService } from '../../core/ui/toast/toast.service';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';
import {
  CreatePropertyRequest,
  UpdatePropertyRequest,
  PropertyResponse
} from '../../modules/properties/api/property.models';
import { CalendarSourceService } from '../../modules/calendar-source/api/calendar-source.service';
import {
  CalendarSourceResponse,
  CreateCalendarSourceRequest
} from '../../modules/calendar-source/api/calendar-source.model';
import { TableCardComponent } from '../../core/ui/table-card/table-card.component';

type ChannelId = 'AIRBNB' | 'VRBO' | 'BOOKING' | 'OTHER';

type PropertyBasicInfoForm = FormGroup<{
  name: FormControl<string>;
  timezone: FormControl<string>;
  addressLine1: FormControl<string>;
  addressLine2: FormControl<string>;
  city: FormControl<string>;
  state: FormControl<string>;
  country: FormControl<string>;
  postalCode: FormControl<string>;
}>;

type SourceForm = FormGroup<{
  publicId: FormControl<string>;
  provider: FormControl<ChannelId>;
  icalUrl: FormControl<string>;
  active: FormControl<boolean>;
}>;

type PropertiesForm = FormGroup<{
  basicInfo: PropertyBasicInfoForm;
  sources: FormArray<SourceForm>;
}>;

type NewSourceForm = FormGroup<{
  channel: FormControl<ChannelId>;
  icalUrl: FormControl<string>;
}>;

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableCardComponent],
  templateUrl: './properties.component.html',
  styleUrl: './properties.component.scss',
})
export class PropertiesComponent {
  @ViewChild('newChannelEl') newChannelEl?: ElementRef<HTMLSelectElement>;

  readonly countries = [
    { code: 'BR', name: 'Brasil' },
    { code: 'US', name: 'Estados Unidos' },
    { code: 'PT', name: 'Portugal' },
  ];

  readonly channels: Array<{ id: ChannelId; name: string }> = [
    { id: 'AIRBNB', name: 'AIRBNB' },
    { id: 'VRBO', name: 'VRBO' },
    { id: 'BOOKING', name: 'BOOKING' },
    { id: 'OTHER', name: 'OUTRO' },
  ];

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly loading = signal(false);

  currentStep: 1 | 2 = 1;

  private readonly propertyPublicId = signal<string | null>(null);
  readonly isEditMode = computed(() => !!this.propertyPublicId());

  readonly form: PropertiesForm = this.fb.group({
    basicInfo: this.fb.group({
      name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
      timezone: this.fb.nonNullable.control('America/Sao_Paulo', [Validators.required, Validators.maxLength(60)]),
      addressLine1: this.fb.nonNullable.control('', [Validators.maxLength(160)]),
      addressLine2: this.fb.nonNullable.control('', [Validators.maxLength(160)]),
      city: this.fb.nonNullable.control('', [Validators.maxLength(80)]),
      state: this.fb.nonNullable.control('', [Validators.maxLength(80)]),
      country: this.fb.nonNullable.control('BR', [Validators.maxLength(2)]),
      postalCode: this.fb.nonNullable.control('', [Validators.maxLength(20)]),
    }),
    sources: this.fb.array<SourceForm>([]),
  });

  readonly newSourceForm: NewSourceForm = this.fb.group({
    channel: this.fb.nonNullable.control<ChannelId>('OTHER', [Validators.required]),
    icalUrl: this.fb.nonNullable.control<string>('', [Validators.required, Validators.maxLength(300)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly propertyService: PropertyService,
    private readonly calendarSourceService: CalendarSourceService,
    private readonly toast: ToastService
  ) {
    const navigationStep = (history.state?.step as 1 | 2 | undefined);
    if (navigationStep) this.currentStep = navigationStep;

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

  channelLabel(channelId: ChannelId | null | undefined) {
    if (!channelId) return '-';
    return this.channels.find(channel => channel.id === channelId)?.name ?? channelId;
  }

  private normalizeProvider(value: unknown): ChannelId {
    const provider = String(value ?? '').toUpperCase();
    if (provider === 'AIRBNB' || provider === 'VRBO' || provider === 'BOOKING' || provider === 'OTHER') {
      return provider;
    }
    return 'OTHER';
  }

  private createSourceGroup(source: CalendarSourceResponse): SourceForm {
    const normalizedProvider = this.normalizeProvider((source as any).provider);

    return this.fb.group({
      publicId: this.fb.nonNullable.control(source.publicId),
      provider: this.fb.nonNullable.control(normalizedProvider),
      icalUrl: this.fb.nonNullable.control(source.icalUrl),
      active: this.fb.nonNullable.control(!!source.active),
    });
  }

  private loadSources(propertyPublicId: string) {
    this.calendarSourceService.listByProperty(propertyPublicId).subscribe({
      next: (sources) => {
        this.sourcesArray.clear();
        sources.forEach((source) => this.sourcesArray.push(this.createSourceGroup(source)));
      },
      error: (err) => {
        this.toast.error('Erro ao carregar canais/iCal');
        console.error(err);
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
      timezone: basicInfoValue.timezone,
      addressLine1: this.normalizeOptionalText(basicInfoValue.addressLine1),
      addressLine2: this.normalizeOptionalText(basicInfoValue.addressLine2),
      city: this.normalizeOptionalText(basicInfoValue.city),
      state: this.normalizeOptionalText(basicInfoValue.state),
      country: this.normalizeOptionalText(basicInfoValue.country),
      postalCode: this.normalizeOptionalText(basicInfoValue.postalCode),
    };
  }

  nextStep() {
    this.markStepOneTouched();
    if (this.stepOneInvalid()) return;

    const existingPublicId = this.propertyPublicId();
    if (existingPublicId) {
      this.currentStep = 2;
      return;
    }

    this.saving.set(true);

    const createRequest: CreatePropertyRequest = this.mapFormToPropertyPayload();

    this.propertyService.create(createRequest).subscribe({
      next: (created: PropertyResponse) => {
        this.propertyPublicId.set(created.publicId);
        this.currentStep = 2;

        this.router.navigate(
          ['/app/properties', created.publicId, 'edit'],
          { replaceUrl: true, state: { step: 2 } }
        );

        this.toast.success('Propriedade criada. Agora adicione os canais.');
        this.saving.set(false);
        this.loadSources(created.publicId);
      },
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Não foi possível criar a propriedade.'));
        this.saving.set(false);
        console.error(err);
      }
    });
  }

  prevStep() {
    this.currentStep = 1;
  }

  goToStep(step: 1 | 2) {
    if (step === 2) {
      this.nextStep();
      return;
    }
    this.currentStep = 1;
  }

  cancel() {
    this.router.navigate(['/app/properties']);
  }

  private resetFormForCreate() {
    this.currentStep = 1;
    this.submitted.set(false);

    this.form.controls.basicInfo.reset({
      name: '',
      timezone: 'America/Sao_Paulo',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: 'BR',
      postalCode: '',
    });

    this.sourcesArray.clear();
    this.newSourceForm.reset({ channel: 'OTHER', icalUrl: '' });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  addSourceFromDraft() {
    this.newSourceForm.markAllAsTouched();
    if (this.newSourceForm.invalid || !this.propertyPublicId()) return;

    const request: CreateCalendarSourceRequest = {
      provider: this.newSourceForm.controls.channel.value,
      icalUrl: this.newSourceForm.controls.icalUrl.value,
    };

    this.calendarSourceService.create(this.propertyPublicId()!, request).subscribe({
      next: (created) => {
        this.sourcesArray.push(this.createSourceGroup(created));
        this.newSourceForm.reset({ channel: 'OTHER', icalUrl: '' });
        this.toast.success('Canal adicionado.');
      },
      error: (err) => {
        this.toast.error('Erro ao adicionar canal.');
        console.error(err);
      }
    });
  }

  removeSource(index: number) {
    const sourceFormGroup = this.sourcesArray.at(index);
    const sourcePublicId = sourceFormGroup.controls.publicId.value;

    this.calendarSourceService.delete(sourcePublicId).subscribe({
      next: () => {
        this.sourcesArray.removeAt(index);
        this.toast.success('Canal removido.');
      },
      error: (err) => {
        this.toast.error('Erro ao remover canal.');
        console.error(err);
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
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Não foi possível carregar a propriedade.'));
        this.loading.set(false);
        this.router.navigate(['/app/properties']);
      }
    });
  }

  private applyPropertyToForm(property: PropertyResponse) {
    this.submitted.set(false);

    this.form.controls.basicInfo.patchValue({
      name: property.name ?? '',
      timezone: property.timezone ?? 'America/Sao_Paulo',
      addressLine1: property.addressLine1 ?? '',
      addressLine2: property.addressLine2 ?? '',
      city: property.city ?? '',
      state: property.state ?? '',
      country: property.country ?? 'BR',
      postalCode: property.postalCode ?? '',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  submit() {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    const propertyPayload = this.mapFormToPropertyPayload();
    const existingPublicId = this.propertyPublicId();

    if (!existingPublicId) {
      this.propertyService.create(propertyPayload).subscribe({
        next: () => {
          this.toast.success('Propriedade cadastrada com sucesso.');
          this.saving.set(false);
          this.router.navigate(['/app/properties']);
        },
        error: (err) => {
          this.toast.error(apiErrorMessage(err, 'Não foi possível salvar a propriedade.'));
          this.saving.set(false);
          console.error(err);
        }
      });

      return;
    }

    const updateRequest: UpdatePropertyRequest = propertyPayload;

    this.propertyService.update(existingPublicId, updateRequest).subscribe({
      next: () => {
        this.toast.success('Propriedade atualizada com sucesso.');
        this.saving.set(false);
        this.router.navigate(['/app/properties']);
      },
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Não foi possível atualizar a propriedade.'));
        this.saving.set(false);
        console.error(err);
      }
    });
  }

  hasError(path: string) {
    const control = this.form.get(path);
    return !!control && control.invalid && (control.dirty || control.touched || this.submitted());
  }

  newSourceError(controlName: 'channel' | 'icalUrl') {
    const control = this.newSourceForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  private stepOneInvalid() {
    return this.form.controls.basicInfo.invalid;
  }

  private markStepOneTouched() {
    this.form.controls.basicInfo.markAllAsTouched();
  }
}
