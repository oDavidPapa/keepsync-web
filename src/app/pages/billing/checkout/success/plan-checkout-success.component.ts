import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ToastService } from '../../../../core/ui/toast/toast.service';
import { BillingService } from '../../../../modules/billing/api/billing.service';
import { apiErrorMessage } from '../../../../modules/properties/api/api-error.util';
import { CurrentUserResponse, UserPlanCode } from '../../../../modules/users/api/user.models';
import { UserService } from '../../../../modules/users/api/user.service';
import { resolveEffectivePlanCode } from '../../../../modules/users/api/user-plan.util';

@Component({
  selector: 'app-plan-checkout-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plan-checkout-success.component.html',
  styleUrl: './plan-checkout-success.component.scss',
})
export class PlanCheckoutSuccessComponent implements OnDestroy {
  readonly loadingUser = signal(false);
  readonly syncing = signal(false);
  readonly portalLoading = signal(false);
  readonly currentUser = signal<CurrentUserResponse | null>(null);
  readonly invalidSession = signal(false);

  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxSyncAttempts = 3;
  private readonly syncIntervalMs = 2500;

  readonly effectivePlanCode = computed<UserPlanCode>(() => resolveEffectivePlanCode(this.currentUser()));
  readonly activated = computed(() => this.effectivePlanCode() !== 'FREE');
  readonly activePlanLabel = computed(() => this.planLabel(this.effectivePlanCode()));
  readonly currentPlanCode = computed(() => this.effectivePlanCode());

  readonly successTitle = computed(() =>
    this.activated() ? 'Tudo certo, seu plano esta ativo' : 'Pagamento confirmado'
  );

  readonly successDescription = computed(() =>
    this.activated()
      ? 'Recebemos seu pagamento e a assinatura ja foi ativada na sua conta. Um recibo foi enviado para o seu e-mail.'
      : 'Recebemos seu pagamento e estamos finalizando a ativacao do seu plano.'
  );

  readonly planCycleLabel = computed(() =>
    this.currentPlanCode() === 'FREE' ? 'Em ativacao' : `${this.activePlanLabel()} - mensal`
  );

  readonly paidTotalLabel = computed(() =>
    this.currentPlanCode() === 'PRO'
      ? this.formatCurrency(149.9)
      : this.currentPlanCode() === 'BASIC'
        ? this.formatCurrency(79.9)
        : 'Processando'
  );

  readonly periodStartLabel = computed(() => {
    const expiresAt = this.currentUser()?.subscriptionExpiresAt;
    if (!expiresAt) {
      return '--';
    }

    const endDate = new Date(expiresAt);
    if (Number.isNaN(endDate.getTime())) {
      return '--';
    }

    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);
    return this.formatDate(startDate);
  });

  readonly periodEndLabel = computed(() => {
    const expiresAt = this.currentUser()?.subscriptionExpiresAt;
    if (!expiresAt) {
      return '--';
    }
    return this.formatDate(expiresAt);
  });

  readonly nextChargeLabel = computed(() => {
    const expiresAt = this.currentUser()?.subscriptionExpiresAt;
    return expiresAt ? this.formatDate(expiresAt) : 'Processando';
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly userService: UserService,
    private readonly billingService: BillingService
  ) {
    const billingResult = (this.route.snapshot.queryParamMap.get('billing') ?? '').trim().toLowerCase();
    const sessionId = (this.route.snapshot.queryParamMap.get('session_id') ?? '').trim();

    if (billingResult !== 'success' || !sessionId.startsWith('cs_')) {
      this.invalidSession.set(true);
      this.toast.warning('Retorno de pagamento invalido. Realize o checkout novamente.');
      return;
    }

    this.loadCurrentUser();
  }

  ngOnDestroy() {
    this.stopSync();
  }

  goToDashboard() {
    void this.router.navigate(['/app/dashboard']);
  }

  backToCheckout() {
    void this.router.navigate(['/app/billing/checkout']);
  }

  openBillingPortal() {
    this.portalLoading.set(true);
    this.billingService.createPortalSession().subscribe({
      next: (response) => {
        this.portalLoading.set(false);
        if (!response.portalUrl?.trim()) {
          this.toast.error('Portal Stripe indisponivel no momento.');
          return;
        }
        window.location.assign(response.portalUrl);
      },
      error: (error) => {
        this.portalLoading.set(false);
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel abrir o portal da assinatura.'));
      },
    });
  }

  private loadCurrentUser(silent = false) {
    this.loadingUser.set(true);
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.loadingUser.set(false);
        this.handleSyncState();
      },
      error: (error) => {
        this.loadingUser.set(false);
        if (!silent) {
          this.toast.error(apiErrorMessage(error, 'Nao foi possivel carregar os dados da assinatura.'));
        }
      },
    });
  }

  private handleSyncState() {
    if (this.invalidSession()) {
      this.stopSync();
      return;
    }

    if (this.activated()) {
      this.stopSync();
      return;
    }

    this.startSync();
  }

  private startSync() {
    if (this.syncTimer) {
      return;
    }

    this.syncing.set(true);
    this.scheduleSyncAttempt(1);
  }

  private scheduleSyncAttempt(attempt: number) {
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      this.userService.getCurrentUser().subscribe({
        next: (user) => {
          this.currentUser.set(user);
          if (resolveEffectivePlanCode(user) !== 'FREE') {
            this.stopSync();
            this.toast.success(`Assinatura ${this.planLabel(resolveEffectivePlanCode(user))} ativada com sucesso.`);
            return;
          }

          if (attempt >= this.maxSyncAttempts) {
            this.stopSync();
            return;
          }

          this.scheduleSyncAttempt(attempt + 1);
        },
        error: () => {
          if (attempt >= this.maxSyncAttempts) {
            this.stopSync();
            return;
          }

          this.scheduleSyncAttempt(attempt + 1);
        },
      });
    }, this.syncIntervalMs);
  }

  private stopSync() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.syncing.set(false);
  }

  private planLabel(planCode: UserPlanCode) {
    switch (planCode) {
      case 'BASIC':
        return 'BASICO';
      case 'PRO':
        return 'PRO';
      case 'FREE':
      default:
        return '--';
    }
  }

  private formatDate(value: string | Date) {
    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
      return '--';
    }
    return dateValue.toLocaleDateString('pt-BR');
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  }
}
