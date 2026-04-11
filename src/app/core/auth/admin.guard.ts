import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { UserService } from '../../modules/users/api/user.service';

export const adminGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  return userService.getCurrentUser().pipe(
    map((currentUser) => {
      if (currentUser.role === 'ADMIN') {
        return true;
      }

      return router.createUrlTree(['/app/dashboard']);
    }),
    catchError(() => of(router.createUrlTree(['/app/dashboard'])))
  );
};
