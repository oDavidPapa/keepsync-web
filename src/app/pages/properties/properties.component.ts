import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { PropertyService } from '../../modules/properties/api/property.service';
import { apiErrorMessage } from '../../modules/properties/api/api-error.util';
import { ToastService } from '../../core/ui/toast/toast.service';

type PropertySourceDraft = {
  channel: string;
  icalUrl: string;
};

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
    { id: 'airbnb', name: 'Airbnb' },
    { id: 'vrbo', name: 'VRBO' },
    { id: 'booking', name: 'Booking' },
    { id: 'other', name: 'Outro' },
  ];

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    addressLine1: ['', [Validators.maxLength(160)]],
    addressLine2: ['', [Validators.maxLength(160)]],
    city: ['', [Validators.maxLength(80)]],
    state: ['', [Validators.maxLength(80)]],
    country: ['', [Validators.maxLength(2)]],
    postalCode: ['', [Validators.maxLength(20)]],
    sources: this.fb.array([]),
  });

  readonly newSourceForm = this.fb.group({
    channel: ['', [Validators.required]],
    icalUrl: ['', [Validators.required, Validators.maxLength(300)]],
  });

  saving = false;
  submitted = false;
  errorMessage: string | null = null;

  currentStep: 1 | 2 = 1;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly propertyService: PropertyService
  ) { }

  get sourcesArray(): FormArray {
    return this.form.get('sources') as FormArray;
  }

  channelLabel(channelId: string | null | undefined): string {
    if (!channelId) return '-';
    return this.channels.find(channelOption => channelOption.id === channelId)?.name ?? channelId;
  }

  /* Stepper */
  nextStep() {
    this.markStepOneTouched();
    if (this.stepOneInvalid()) return;
    this.currentStep = 2;
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
    // volta pra listagem
    this.router.navigate(['/app/properties']);
  }

  resetStep1() {
    this.form.patchValue({
      name: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.submitted = false;
  }

  /* Canais */
  focusNewChannel() {
    setTimeout(() => this.newChannelEl?.nativeElement?.focus(), 0);
  }

  addSourceFromDraft() {
    this.newSourceForm.markAllAsTouched();
    if (this.newSourceForm.invalid) return;

    const draft = this.newSourceForm.getRawValue() as PropertySourceDraft;

    const sourceGroup = this.fb.group({
      channel: [draft.channel, [Validators.required]],
      icalUrl: [draft.icalUrl, [Validators.required, Validators.maxLength(300)]],
    });

    this.sourcesArray.push(sourceGroup);

    this.newSourceForm.reset({ channel: '', icalUrl: '' });
    this.newSourceForm.markAsPristine();
    this.newSourceForm.markAsUntouched();
  }

  removeSource(index: number) {
    this.sourcesArray.removeAt(index);
  }

  /* Submit -> POST /v1/properties */
  submit() {
    this.submitted = true;
    this.errorMessage = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    const rawValue = this.form.getRawValue();
    const createRequest = {
      name: rawValue.name!,
      timezone: 'America/Sao_Paulo', 
      addressLine1: rawValue.addressLine1 || null,
      addressLine2: rawValue.addressLine2 || null,
      city: rawValue.city || null,
      state: rawValue.state || null,
      country: rawValue.country || null,
      postalCode: rawValue.postalCode || null,

      sources: (rawValue.sources ?? []).map((sourceItem: any) => ({
        channel: sourceItem.channel,
        icalUrl: sourceItem.icalUrl,
      })),
    };

    this.propertyService.create(createRequest).subscribe({
      next: (createdProperty) => {
        this.saving = false;
        this.toast.success('Propriedade cadastrada com sucesso.');
        this.router.navigate(['/app/properties']);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = apiErrorMessage(error, 'Não foi possível salvar a propriedade.');
        console.error(error);
      },
    });
  }

  hasError(controlName: keyof typeof this.form.controls) {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched || this.submitted);
  }

  newSourceError(controlName: 'channel' | 'icalUrl') {
    const control = this.newSourceForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private stepOneInvalid() {
    const controls = [
      'name',
      'addressLine1',
      'addressLine2',
      'city',
      'state',
      'country',
      'postalCode',
    ] as const;

    return controls.some((controlName) => this.form.get(controlName)?.invalid);
  }

  private markStepOneTouched() {
    const controls = [
      'name',
      'addressLine1',
      'addressLine2',
      'city',
      'state',
      'country',
      'postalCode',
    ] as const;

    controls.forEach((controlName) => this.form.get(controlName)?.markAsTouched());
  }
}
