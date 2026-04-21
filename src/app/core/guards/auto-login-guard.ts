import { CanActivateFn } from '@angular/router';

export const autoLoginGuard: CanActivateFn = (route, state) => {
  return true;
};
