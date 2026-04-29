export type BillingPlanCode = 'BASIC' | 'PRO';
export type BillingCycle = 'MONTHLY';

export interface CreateCheckoutSessionRequest {
  planCode: BillingPlanCode;
  billingCycle: BillingCycle;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  checkoutUrl: string;
  expiresAt?: string | null;
}

export interface PortalSessionResponse {
  portalUrl: string;
}
