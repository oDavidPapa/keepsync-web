import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

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

  nav: NavItem[] = [
    { label: 'Dashboard', route: '/app/dashboard', icon: 'dashboard' },
    { label: 'Reservas', route: '/app/reservations', icon: 'event_available' },
    { label: 'Calendarios', route: '/app/calendars', icon: 'calendar_month' },
    { label: 'Propriedades', route: '/app/properties', icon: 'home_work' },
    { label: 'Notificacoes', route: '/app/notifications', icon: 'notifications', badge: 3 },
    { label: 'Configuracoes', route: '/app/settings', icon: 'settings' },
  ];

  trackByRoute(_: number, item: NavItem) {
    return item.route;
  }
}
