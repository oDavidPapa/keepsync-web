import { CurrentUserResponse, UserPlanCode } from './user.models';

type UserPlanSnapshot = Pick<CurrentUserResponse, 'planCode' | 'subscriptionExpiresAt'>;

export function resolveEffectivePlanCode(user: UserPlanSnapshot | null | undefined): UserPlanCode {
  if (!user || user.planCode === 'FREE') {
    return 'FREE';
  }

  const subscriptionExpiresAt = user.subscriptionExpiresAt;
  if (!subscriptionExpiresAt) {
    return 'FREE';
  }

  const expiresAtMs = new Date(subscriptionExpiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) {
    return 'FREE';
  }

  return expiresAtMs > Date.now() ? user.planCode : 'FREE';
}

export function isSubscriptionExpired(user: UserPlanSnapshot | null | undefined): boolean {
  if (!user || user.planCode === 'FREE') {
    return false;
  }

  const effectivePlanCode = resolveEffectivePlanCode(user);
  return effectivePlanCode === 'FREE';
}
