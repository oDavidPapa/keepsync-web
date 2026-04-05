import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { PageHeaderComponent } from '../../../core/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast/toast.service';
import { apiErrorMessage } from '../../../modules/properties/api/api-error.util';
import {
  ReservationFinanceResponse,
  ReservationResponse,
  ReservationStatus,
  UpsertReservationFinanceRequest,
} from '../../../modules/reservations/api/reservation.models';
import { ReservationService } from '../../../modules/reservations/api/reservation.service';

@Component({
  selector: 'app-reservation-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './reservation-edit.component.html',
  styleUrl: './reservation-edit.component.scss',
})
export class ReservationEditComponent {
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly reservation = signal<ReservationResponse | null>(null);

  readonly form = this.fb.group({
    guestTotal: [''],
    hostPayoutTotal: [''],
    totalFees: [''],
    cleaningFee: [''],
    adjustmentsTotal: [''],
    currency: ['BRL', [Validators.required, Validators.maxLength(3)]],
    payoutDate: [''],
    notes: ['', [Validators.maxLength(500)]],
  });

  readonly pageSubtitle = computed(() => {
    const reservation = this.reservation();
    if (!reservation) {
      return 'Carregando dados da reserva...';
    }

    return `${reservation.propertyName || 'Reserva sem propriedade'} - ${this.statusLabel(reservation.status)}`;
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly reservationService: ReservationService
  ) {
    this.route.paramMap.subscribe((params) => {
      const publicId = params.get('publicId');
      if (!publicId) {
        this.router.navigate(['/app/reservations']);
        return;
      }

      this.load(publicId);
    });
  }

  load(publicId: string) {
    this.loading.set(true);

    forkJoin({
      reservation: this.reservationService.get(publicId),
      finance: this.reservationService.getFinance(publicId),
    }).subscribe({
      next: ({ reservation, finance }) => {
        this.reservation.set(reservation);
        this.applyFinanceToForm(finance);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Nao foi possivel carregar a reserva.'));
        this.loading.set(false);
        console.error(err);
        this.router.navigate(['/app/reservations']);
      },
    });
  }

  goBack() {
    this.router.navigate(['/app/reservations']);
  }

  submit() {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const reservation = this.reservation();
    if (!reservation) {
      return;
    }

    this.saving.set(true);

    this.reservationService.upsertFinance(reservation.publicId, this.mapFormToPayload()).subscribe({
      next: (finance) => {
        this.applyFinanceToForm(finance);
        this.saving.set(false);
        this.toast.success('Reserva atualizada com sucesso.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(err, 'Nao foi possivel salvar os dados da reserva.'));
        console.error(err);
      },
    });
  }

  statusLabel(status: ReservationStatus) {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmada';
      case 'POSSIBLY_CANCELLED':
        return 'Possivelmente cancelada';
      case 'CANCELLED':
        return 'Cancelada';
      case 'COMPLETED':
        return 'Concluida';
      default:
        return status;
    }
  }

  statusBadgeClass(status: ReservationStatus) {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'success';
      case 'POSSIBLY_CANCELLED':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      default:
        return '';
    }
  }

  hasError(controlName: keyof typeof this.form.controls) {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched || this.submitted());
  }

  private applyFinanceToForm(finance: ReservationFinanceResponse) {
    this.form.patchValue({
      guestTotal: this.decimalToInput(finance.guestTotal),
      hostPayoutTotal: this.decimalToInput(finance.hostPayoutTotal),
      totalFees: this.decimalToInput(finance.totalFees),
      cleaningFee: this.decimalToInput(finance.cleaningFee),
      adjustmentsTotal: this.decimalToInput(finance.adjustmentsTotal),
      currency: (finance.currency ?? 'BRL').toUpperCase(),
      payoutDate: this.isoToDatetimeLocal(finance.payoutDate),
      notes: finance.notes ?? '',
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.submitted.set(false);
  }

  private mapFormToPayload(): UpsertReservationFinanceRequest {
    const raw = this.form.getRawValue();

    return {
      guestTotal: this.inputToDecimal(raw.guestTotal),
      hostPayoutTotal: this.inputToDecimal(raw.hostPayoutTotal),
      totalFees: this.inputToDecimal(raw.totalFees),
      cleaningFee: this.inputToDecimal(raw.cleaningFee),
      adjustmentsTotal: this.inputToDecimal(raw.adjustmentsTotal),
      currency: raw.currency?.trim().toUpperCase() || 'BRL',
      payoutDate: this.datetimeLocalToIso(raw.payoutDate),
      notes: raw.notes?.trim() || null,
    };
  }

  private decimalToInput(value: number | null | undefined) {
    return value == null ? '' : String(value);
  }

  private inputToDecimal(value: string | null | undefined) {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isoToDatetimeLocal(value: string | null | undefined) {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const pad = (input: number) => String(input).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private datetimeLocalToIso(value: string | null | undefined) {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
}
