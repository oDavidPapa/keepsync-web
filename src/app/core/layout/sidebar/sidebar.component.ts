import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TokenStorageService } from '../../auth/token-storage.service';
import { UserService } from '../../../modules/users/api/user.service';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() mobileOpen = false;

  private readonly baseNav: NavItem[] = [
    { label: 'Dashboard', route: '/app/dashboard', icon: 'dashboard' },
    { label: 'Reservas', route: '/app/reservations', icon: 'event_available' },
    { label: 'Calendarios', route: '/app/calendars', icon: 'calendar_month' },
    { label: 'Propriedades', route: '/app/properties', icon: 'home_work' },
    { label: 'Notificacoes', route: '/app/notifications', icon: 'notifications', badge: 3 },
    { label: 'Usuarios', route: '/app/users', icon: 'groups' },
    { label: 'Configuracoes', route: '/app/settings', icon: 'settings' },
  ];

  readonly nav = signal<NavItem[]>(this.baseNav.filter((item) => item.route !== '/app/users'));

  constructor(
    private readonly tokenStorage: TokenStorageService,
    private readonly userService: UserService
  ) {
    if (!this.tokenStorage.has()) {
      return;
    }

    this.userService.getCurrentUser().subscribe({
      next: (currentUser) => {
        this.nav.set(
          currentUser.role === 'ADMIN'
            ? this.baseNav
            : this.baseNav.filter((item) => item.route !== '/app/users')
        );
      },
      error: () => {
        this.nav.set(this.baseNav.filter((item) => item.route !== '/app/users'));
      }
    });
  }

  trackByRoute(_: number, item: NavItem) {
    return item.route;
  }
}
