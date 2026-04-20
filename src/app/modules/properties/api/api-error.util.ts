import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../../../core/api/api.models';

export function apiErrorMessage(error: unknown, fallbackMessage: string) {
  const httpError = error as HttpErrorResponse;

  const apiError = httpError?.error as ApiError | undefined;
  if (apiError?.error === 'MANUAL_SYNC_COOLDOWN_ACTIVE') {
    return manualSyncCooldownMessage(apiError.message);
  }

  if (apiError?.message) return apiError.message;

  if (typeof httpError?.error === 'string' && httpError.error.trim()) return httpError.error;

  return fallbackMessage;
}

function manualSyncCooldownMessage(rawMessage?: string): string {
  const remainingSeconds = extractRemainingSeconds(rawMessage);
  if (remainingSeconds === null) {
    return 'Sincronizacao manual indisponivel no momento. Aguarde alguns instantes e tente novamente.';
  }

  return `Sincronizacao manual indisponivel no momento. Tente novamente em ${formatRemainingTime(remainingSeconds)} para esta propriedade.`;
}

function extractRemainingSeconds(rawMessage?: string): number | null {
  if (!rawMessage) {
    return null;
  }

  const secondsMatch = rawMessage.match(/(\d+)\s*(seconds?|segundos?)/i);
  if (!secondsMatch) {
    return null;
  }

  const value = Number(secondsMatch[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function formatRemainingTime(remainingSeconds: number): string {
  const safeRemainingSeconds = Math.max(1, Math.floor(remainingSeconds));
  const minutes = Math.floor(safeRemainingSeconds / 60);
  const seconds = safeRemainingSeconds % 60;

  if (minutes === 0) {
    return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
  }

  if (seconds === 0) {
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }

  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} e ${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
}
