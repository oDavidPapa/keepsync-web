import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './properties.component.html',
  styleUrl: './properties.component.scss'
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

  // draft do “Novo canal”
  readonly newSourceForm = this.fb.group({
    channel: ['', [Validators.required]],
    icalUrl: ['', [Validators.required, Validators.maxLength(300)]],
  });

  saving = false;
  submitted = false;
  currentStep: 1 | 2 = 1;

  constructor(private readonly fb: FormBuilder) {}

  get sourcesArray() {
    return this.form.get('sources') as FormArray;
  }

  channelLabel(id: string | null | undefined) {
    if (!id) return '-';
    return this.channels.find(c => c.id === id)?.name ?? id;
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

    const { channel, icalUrl } = this.newSourceForm.getRawValue();

    const group = this.fb.group({
      channel: [channel, [Validators.required]],
      icalUrl: [icalUrl, [Validators.required, Validators.maxLength(300)]],
    });

    this.sourcesArray.push(group);

    this.newSourceForm.reset({ channel: '', icalUrl: '' });
    this.newSourceForm.markAsPristine();
    this.newSourceForm.markAsUntouched();
  }

  removeSource(index: number) {
    this.sourcesArray.removeAt(index);
  }

  /* Submit */
  submit() {
    this.submitted = true;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = this.form.getRawValue();
    console.log('CreatePropertyRequest', payload);

    setTimeout(() => {
      this.saving = false;
    }, 600);
  }

  /* Errors */
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

    return controls.some((key) => this.form.get(key)?.invalid);
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

    controls.forEach((key) => this.form.get(key)?.markAsTouched());
  }
}
