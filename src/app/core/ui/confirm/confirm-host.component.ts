import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-host.component.html',
  styleUrl: './confirm-host.component.scss',
})
export class ConfirmHostComponent {
  constructor(public readonly confirm: ConfirmService) {}

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.confirm.state().open) {
      this.confirm.cancel();
    }
  }

  canConfirm(): boolean {
    const state = this.confirm.state();
    if (!state.requireText) return true;
    return (state.inputValue ?? '').trim() === state.requireText;
  }
}
