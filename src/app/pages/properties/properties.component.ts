import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { PropertyService } from '../../modules/properties/api/property.service';
import { ToastService } from '../../core/ui/toast/toast.service';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';
import { CreatePropertyRequest, UpdatePropertyRequest, PropertyResponse } from '../../modules/properties/api/property.models';
import { CalendarSourceService } from '../../modules/calendar-source/api/calendar-source.service';
import { CalendarSourceResponse, CreateCalendarSourceRequest } from '../../modules/calendar-source/api/calendar-source.model';
import { TableCardComponent } from '../../core/ui/table-card/table-card.component';

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

  readonly channels = [
    { id: 'AIRBNB', name: 'AIRBNB' },
    { id: 'VRBO', name: 'VRBO' },
    { id: 'BOOKING', name: 'BOOKING' },
    { id: 'OTHER', name: 'OUTRO' },
  ];

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly loading = signal(false);

  currentStep: 1 | 2 = 1;

  private readonly publicId = signal<string | null>(null);
  readonly isEditMode = computed(() => !!this.publicId());

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    timezone: ['America/Sao_Paulo', [Validators.required, Validators.maxLength(60)]],
    addressLine1: ['', [Validators.maxLength(160)]],
    addressLine2: ['', [Validators.maxLength(160)]],
    city: ['', [Validators.maxLength(80)]],
    state: ['', [Validators.maxLength(80)]],
    country: ['BR', [Validators.maxLength(2)]],
    postalCode: ['', [Validators.maxLength(20)]],
    sources: this.fb.array([]),
  });

  readonly newSourceForm = this.fb.group({
    channel: ['', [Validators.required]],
    icalUrl: ['', [Validators.required, Validators.maxLength(300)]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly propertyService: PropertyService,
    private readonly calendarSourceService: CalendarSourceService,
    private readonly toast: ToastService
  ) {
    const navStep = (history.state?.step as 1 | 2 | undefined);
    if (navStep) this.currentStep = navStep;

    this.route.paramMap.subscribe((params) => {
      const routePublicId = params.get('publicId');

      if (!routePublicId) {
        this.publicId.set(null);
        this.loading.set(false);
        this.resetFormForCreate();
        return;
      }

      this.publicId.set(routePublicId);
      this.loadForEdit(routePublicId);
    });
  }

  private createSourceGroup(source: CalendarSourceResponse) {
    return this.fb.group({
      publicId: [source.publicId],
      provider: [source.provider],
      icalUrl: [source.icalUrl],
      active: [source.active],
    });
  }

  private loadSources(propertyPublicId: string) {
    this.calendarSourceService.listByProperty(propertyPublicId).subscribe({
      next: (sources) => {
        this.sourcesArray.clear();
        sources.forEach(source =>
          this.sourcesArray.push(this.createSourceGroup(source))
        );
      },
      error: (err) => {
        this.toast.error('Erro ao carregar canais/iCal');
        console.error(err);
      }
    });
  }

  get sourcesArray() {
    return this.form.get('sources') as FormArray;
  }

  channelLabel(channelId: string | null | undefined) {
    if (!channelId) return '-';
    return this.channels.find(channel => channel.id === channelId)?.name ?? channelId;
  }

  nextStep() {
    this.markStepOneTouched();
    if (this.stepOneInvalid()) return;

    const existingId = this.publicId();
    if (existingId) {
      this.currentStep = 2;
      return;
    }

    this.saving.set(true);

    const raw = this.form.getRawValue();

    const createRequest: CreatePropertyRequest = {
      name: raw.name ?? '',
      timezone: raw.timezone ?? 'America/Sao_Paulo',
      addressLine1: (raw.addressLine1 ?? '').trim() || undefined,
      addressLine2: (raw.addressLine2 ?? '').trim() || undefined,
      city: (raw.city ?? '').trim() || undefined,
      state: (raw.state ?? '').trim() || undefined,
      country: (raw.country ?? '').trim() || undefined,
      postalCode: (raw.postalCode ?? '').trim() || undefined,
    };

    this.propertyService.create(createRequest).subscribe({
      next: (created: PropertyResponse) => {
        this.publicId.set(created.publicId);
        this.currentStep = 2;

        this.router.navigate(
          ['/app/properties', created.publicId, 'edit'],
          {
            replaceUrl: true,
            state: { step: 2 },
          }
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

    this.form.reset({
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
    this.newSourceForm.reset({ channel: '', icalUrl: '' });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  addSourceFromDraft() {
    this.newSourceForm.markAllAsTouched();
    if (this.newSourceForm.invalid || !this.publicId()) return;

    const request: CreateCalendarSourceRequest = {
      provider: this.newSourceForm.value.channel as any,
      icalUrl: this.newSourceForm.value.icalUrl!,
    };

    this.calendarSourceService
      .create(this.publicId()!, request)
      .subscribe({
        next: (created) => {
          this.sourcesArray.push(this.createSourceGroup(created));
          this.newSourceForm.reset();
          this.toast.success('Canal adicionado.');
        },
        error: (err) => {
          this.toast.error('Erro ao adicionar canal.');
          console.error(err);
        }
      });
  }

  removeSource(index: number) {
    const source = this.sourcesArray.at(index);
    const publicId = source.get('publicId')?.value;

    if (!publicId) {
      this.sourcesArray.removeAt(index);
      return;
    }

    this.calendarSourceService.delete(publicId).subscribe({
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
  /* Load edit */
  private loadForEdit(publicId: string) {
    this.loading.set(true);

    this.propertyService.get(publicId).subscribe({
      next: (property) => {
        this.applyPropertyToForm(property);
        this.loading.set(false);
        this.loadSources(publicId);
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

    this.form.patchValue({
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

  /* Submit */
  submit() {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    const raw = this.form.getRawValue();

    const payloadBase = {
      name: raw.name ?? '',
      timezone: raw.timezone ?? 'America/Sao_Paulo',
      addressLine1: (raw.addressLine1 ?? '').trim() || undefined,
      addressLine2: (raw.addressLine2 ?? '').trim() || undefined,
      city: (raw.city ?? '').trim() || undefined,
      state: (raw.state ?? '').trim() || undefined,
      country: (raw.country ?? '').trim() || undefined,
      postalCode: (raw.postalCode ?? '').trim() || undefined,
    };

    const publicId = this.publicId();

    if (!publicId) {
      const createRequest: CreatePropertyRequest = payloadBase;

      this.propertyService.create(createRequest).subscribe({
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

    const updateRequest: UpdatePropertyRequest = payloadBase;

    this.propertyService.update(publicId, updateRequest).subscribe({
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

  hasError(controlName: keyof typeof this.form.controls) {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched || this.submitted());
  }

  newSourceError(controlName: 'channel' | 'icalUrl') {
    const control = this.newSourceForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private stepOneInvalid() {
    const controls = ['name', 'timezone', 'addressLine1', 'addressLine2', 'city', 'state', 'country', 'postalCode'] as const;
    return controls.some((key) => this.form.get(key)?.invalid);
  }

  private markStepOneTouched() {
    const controls = ['name', 'timezone', 'addressLine1', 'addressLine2', 'city', 'state', 'country', 'postalCode'] as const;
    controls.forEach((key) => this.form.get(key)?.markAsTouched());
  }
}
