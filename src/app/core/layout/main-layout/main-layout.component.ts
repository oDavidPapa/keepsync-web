import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { UserService } from '../../../modules/users/api/user.service';
import { ToastService } from '../../ui/toast/toast.service';
import { ToastHostComponent } from '../../ui/toast/toast-host.component';
import { ConfirmHostComponent } from '../../ui/confirm/confirm-host.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, ToastHostComponent, ConfirmHostComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
  mobileOpen = false;

  readonly termsModalOpen = signal(false);
  readonly termsSubmitting = signal(false);
  readonly termsChecked = signal(false);

  constructor(
    private readonly userService: UserService,
    private readonly toast: ToastService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadTermsStatus();
  }

  onTermsCheckedChange(checked: boolean): void {
    this.termsChecked.set(checked);
  }

  acceptTerms(): void {
    if (this.termsSubmitting()) {
      return;
    }

    if (!this.termsChecked()) {
      this.toast.error('Voce precisa marcar o aceite para continuar.');
      return;
    }

    this.termsSubmitting.set(true);

    this.userService.acceptCurrentUserTerms({ accepted: true }).subscribe({
      next: () => {
        this.termsSubmitting.set(false);
        this.termsChecked.set(false);
        this.termsModalOpen.set(false);

        this.toast.success('Termos aceitos com sucesso.');
      },
      error: () => {
        this.termsSubmitting.set(false);
        this.toast.error('Nao foi possivel registrar o aceite dos termos.');
      },
    });
  }

  logoutFromTerms(): void {
    this.authService.logout();
  }

  private loadTermsStatus(): void {
    this.userService.getCurrentUser().subscribe({
      next: (currentUser) => {
        this.termsModalOpen.set(currentUser?.termsAcceptanceRequired === true);
      },
      error: () => {
        this.termsModalOpen.set(false);
      },
    });
  }
}
