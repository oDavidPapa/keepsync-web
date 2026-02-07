import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../../../core/api/api.models';

export function apiErrorMessage(err: unknown, fallback = 'Ocorreu um erro inesperado.') {
  const httpErr = err as HttpErrorResponse;
  const body = httpErr?.error as ApiError | undefined;

  if (body?.message) return body.message;
  if (typeof httpErr?.message === 'string' && httpErr.message.trim()) return httpErr.message;

  return fallback;
}
