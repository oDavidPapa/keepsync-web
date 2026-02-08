import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'info' | 'warning' | 'danger';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  createdAt: number;
  durationMs: number;
  dismissible: boolean;
}

function uid(): string {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  show(partial: {
    type?: ToastType;
    title?: string;
    message: string;
    durationMs?: number;
    dismissible?: boolean;
  }) {
    const toast: ToastItem = {
      id: uid(),
      type: partial.type ?? 'info',
      title: partial.title,
      message: partial.message,
      createdAt: Date.now(),
      durationMs: partial.durationMs ?? 3500,
      dismissible: partial.dismissible ?? true,
    };

    this.toasts.update(list => [toast, ...list]);

    if (toast.durationMs > 0) {
      window.setTimeout(() => this.dismiss(toast.id), toast.durationMs);
    }
  }

  success(message: string, title = 'Sucesso') {
    this.show({ type: 'success', title, message });
  }

  info(message: string, title = 'Info') {
    this.show({ type: 'info', title, message });
  }

  warning(message: string, title = 'Atenção') {
    this.show({ type: 'warning', title, message });
  }

  error(message: string, title = 'Erro') {
    this.show({ type: 'danger', title, message, durationMs: 4500 });
  }

  dismiss(id: string) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  clear() {
    this.toasts.set([]);
  }
}
