import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../../../core/api/api.models';

export function apiErrorMessage(error: unknown, fallbackMessage: string) {
  const httpError = error as HttpErrorResponse;

  const apiError = httpError?.error as ApiError | undefined;
  if (apiError?.message) return apiError.message;

  if (typeof httpError?.error === 'string' && httpError.error.trim()) return httpError.error;

  return fallbackMessage;
}
