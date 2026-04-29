import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { PageHeaderComponent } from '../../../core/ui/page-header/page-header.component';
import { ToastService } from '../../../core/ui/toast/toast.service';
import { BillingPlanCode } from '../../../modules/billing/api/billing.models';
import { BillingService } from '../../../modules/billing/api/billing.service';
import { apiErrorMessage } from '../../../modules/properties/api/api-error.util';
import { CurrentUserResponse, UserPlanCode } from '../../../modules/users/api/user.models';
import { UserService } from '../../../modules/users/api/user.service';
import { isSubscriptionExpired, resolveEffectivePlanCode } from '../../../modules/users/api/user-plan.util';

interface PlanOffer {
  code: BillingPlanCode;
  name: string;
  description: string;
  badge?: string;
  priceInCents: number;
  ctaLabel: string;
  benefits: string[];
}

@Component({
  selector: 'app-plan-checkout',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: './plan-checkout.component.html',
  styleUrl: './plan-checkout.component.scss',
})
export class PlanCheckoutComponent {
  readonly loadingUser = signal(false);
  readonly checkoutLoadingPlan = signal<BillingPlanCode | null>(null);
  readonly portalLoading = signal(false);
  readonly currentUser = signal<CurrentUserResponse | null>(null);

  readonly planOffers: ReadonlyArray<PlanOffer> = [
    {
      code: 'BASIC',
      name: 'Basico',
      description: 'Para profissionalizar a operacao sem complicar o fluxo.',
      priceInCents: 7990,
      ctaLabel: 'Assinar Basico',
      benefits: [
        'Ate 3 propriedades ativas',
        'Ate 3 canais por propriedade',
        'Sincronizacao automatica a cada 10 minutos',
        'Sincronizacao manual com intervalo de 3 minutos',
        'Notificacoes por e-mail e WhatsApp',
      ],
    },
    {
      code: 'PRO',
      name: 'Pro',
      description: 'Para quem precisa de mais velocidade e previsibilidade.',
      badge: 'Recomendado',
      priceInCents: 14990,
      ctaLabel: 'Assinar Pro',
      benefits: [
        'Propriedades ilimitadas',
        'Canais por propriedade ilimitados',
        'Sincronizacao automatica a cada 2 minutos',
        'Sincronizacao manual com intervalo de 1 minuto',
        'Notificacoes por e-mail e WhatsApp',
      ],
    },
  ];

  readonly effectivePlanCode = computed<UserPlanCode>(() => resolveEffectivePlanCode(this.currentUser()));
  readonly hasActivePaidSubscription = computed(() => this.effectivePlanCode() !== 'FREE');
  readonly hasExpiredPaidSubscription = computed(() => isSubscriptionExpired(this.currentUser()));
  readonly checkoutEnabled = computed(() => !this.hasActivePaidSubscription());

  readonly currentPlanLabel = computed(() => this.planLabel(this.effectivePlanCode()));

  readonly subscriptionDescription = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return 'Carregando informacoes da assinatura...';
    }

    if (this.effectivePlanCode() === 'FREE') {
      return 'Plano gratuito ativo. Escolha um plano pago para desbloquear recursos.';
    }

    if (!user.subscriptionExpiresAt) {
      return 'Assinatura ativa.';
    }

    return `Vigencia ate ${this.formatDate(user.subscriptionExpiresAt)}.`;
  });

  readonly checkoutBusy = computed(() => this.checkoutLoadingPlan() !== null);
  readonly checkoutHint = computed(() => {
    if (this.hasActivePaidSubscription()) {
      return 'Sua assinatura esta ativa e a renovacao e automatica. Para alteracoes de plano, ciclo ou cancelamento, use o portal Stripe.';
    }

    if (this.hasExpiredPaidSubscription()) {
      return 'Sua assinatura anterior expirou. Voce pode reativar agora escolhendo um novo plano.';
    }

    return 'Escolha um plano para iniciar sua assinatura.';
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly userService: UserService,
    private readonly billingService: BillingService
  ) {
    this.handleBillingResultQueryParam();
    this.loadCurrentUser();
  }

  startCheckout(planCode: BillingPlanCode) {
    if (!this.checkoutEnabled()) {
      this.toast.info('Com assinatura ativa, as alteracoes devem ser feitas no portal Stripe.');
      return;
    }

    if (this.isCurrentPlan(planCode)) {
      return;
    }

    this.checkoutLoadingPlan.set(planCode);

    this.billingService.createCheckoutSession({
      planCode,
      billingCycle: 'MONTHLY',
    }).subscribe({
      next: (response) => {
        this.checkoutLoadingPlan.set(null);

        if (!response.checkoutUrl?.trim()) {
          this.toast.error('Checkout Stripe indisponivel no momento.');
          return;
        }

        window.location.assign(response.checkoutUrl);
      },
      error: (error) => {
        this.checkoutLoadingPlan.set(null);
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel iniciar o checkout Stripe.'));
      },
    });
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

  goToSettings() {
    void this.router.navigate(['/app/settings']);
  }

  private loadCurrentUser() {
    this.loadingUser.set(true);
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.loadingUser.set(false);
      },
      error: (error) => {
        this.loadingUser.set(false);
        this.toast.error(apiErrorMessage(error, 'Nao foi possivel carregar os dados do plano.'));
      },
    });
  }

  private handleBillingResultQueryParam() {
    const billingResult = (this.route.snapshot.queryParamMap.get('billing') ?? '').trim().toLowerCase();
    if (!billingResult) {
      return;
    }

    if (billingResult === 'success') {
      this.toast.success('Checkout concluido. Seu plano sera atualizado apos o webhook do Stripe.');
      this.clearBillingQueryParams();
      return;
    }

    if (billingResult === 'cancel') {
      this.toast.warning('Checkout cancelado. Nenhuma alteracao foi aplicada.');
      this.clearBillingQueryParams();
      return;
    }

    this.clearBillingQueryParams();
  }

  private clearBillingQueryParams() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        billing: null,
        session_id: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private planLabel(planCode: UserPlanCode) {
    switch (planCode) {
      case 'BASIC':
        return 'Basico';
      case 'PRO':
        return 'Pro';
      case 'FREE':
      default:
        return 'Free';
    }
  }

  private formatDate(value: string) {
    return new Date(value).toLocaleDateString('pt-BR');
  }

  isCurrentPlan(planCode: BillingPlanCode) {
    return this.hasActivePaidSubscription() && this.effectivePlanCode() === planCode;
  }

  priceLabel(offer: PlanOffer) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(offer.priceInCents / 100);
  }

  priceCycleSuffix() {
    return '/mes';
  }

  isCheckoutLoading(planCode: BillingPlanCode) {
    return this.checkoutLoadingPlan() === planCode;
  }

  checkoutButtonLabel(offer: PlanOffer) {
    if (!this.checkoutEnabled()) {
      return 'Gerenciar no portal';
    }

    if (this.isCurrentPlan(offer.code)) {
      return 'Plano atual';
    }

    return offer.ctaLabel;
  }

  checkoutButtonIcon(offer: PlanOffer) {
    if (!this.checkoutEnabled()) {
      return 'manage_accounts';
    }

    if (this.isCurrentPlan(offer.code)) {
      return 'check_circle';
    }

    return 'workspace_premium';
  }
}
