import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';

/**
 * Protege las rutas internas del workspace (/inicio, /apuntes, /tareas, /calendario, /recordatorios).
 * Si no hay un usuario con sesión activa, redirige a /bienvenida.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/bienvenida']);
};

/**
 * Impide que un usuario ya autenticado acceda a /bienvenida, redirigiéndolo a /inicio.
 */
export const unauthGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/inicio']);
};
