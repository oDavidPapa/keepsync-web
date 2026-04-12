import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TokenStorageService } from './token-storage.service';

export const authGuard: CanActivateFn = (_, state) => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);

  if (tokenStorage.hasValidToken()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirectTo: state.url },
  });
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);

  if (!tokenStorage.hasValidToken()) {
    return true;
  }

  return router.createUrlTree(['/app/dashboard']);
};
