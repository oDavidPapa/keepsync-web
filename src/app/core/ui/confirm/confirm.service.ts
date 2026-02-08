import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type ConfirmTone = 'default' | 'danger';

export interface ConfirmOptions {
  title: string;
  message: string;

  confirmText?: string;
  cancelText?: string;

  tone?: ConfirmTone;

  hint?: string;

  requireText?: string;
}

export interface ConfirmState extends Required<Pick<ConfirmOptions,
  'title' | 'message' | 'confirmText' | 'cancelText' | 'tone'
>> {
  open: boolean;
  hint?: string;
  requireText?: string;
  inputValue: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly decisionSubject = new Subject<boolean>();

  readonly state = signal<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    tone: 'default',
    hint: undefined,
    requireText: undefined,
    inputValue: '',
  });

  ask(options: ConfirmOptions): Observable<boolean> {
    this.state.set({
      open: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText ?? 'Confirmar',
      cancelText: options.cancelText ?? 'Cancelar',
      tone: options.tone ?? 'default',
      hint: options.hint,
      requireText: options.requireText,
      inputValue: '',
    });

    return this.decisionSubject.asObservable();
  }

  setInput(value: string) {
    this.state.update(s => ({ ...s, inputValue: value }));
  }

  confirm() {
    this.closeWith(true);
  }

  cancel() {
    this.closeWith(false);
  }

  private closeWith(value: boolean) {
    this.state.update(s => ({ ...s, open: false, inputValue: '' }));

    this.decisionSubject.next(value);
  }
}
