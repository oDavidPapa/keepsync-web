import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { environment } from '../../../../environments/environment';
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

  private readonly adminRoute = '/app/users';

  private readonly baseNav: NavItem[] = [
    { label: 'Dashboard', route: '/app/dashboard', icon: 'dashboard' },
    { label: 'Reservas', route: '/app/reservations', icon: 'event_available' },
    { label: 'Calendarios', route: '/app/calendars', icon: 'calendar_month' },
    { label: 'Propriedades', route: '/app/properties', icon: 'home_work' },
    { label: 'Notificacoes', route: '/app/notifications', icon: 'notifications', badge: 3 },
    { label: 'Usuarios', route: '/app/users', icon: 'group' },
    { label: 'Configuracoes', route: '/app/settings', icon: 'manage_accounts' }
  ];

  readonly nav = signal<NavItem[]>(this.getDefaultNav());

  constructor(
    private readonly tokenStorage: TokenStorageService,
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef
  ) {
    this.refreshMenuFromSession();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.refreshMenuFromSession());
  }

  trackByRoute(_: number, item: NavItem): string {
    return item.route;
  }

  private refreshMenuFromSession(): void {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      this.applyRoleToMenu(null);
      return;
    }

    this.userService.getCurrentUser().subscribe({
      next: (response: unknown) => {
        const apiRole = this.extractRoleFromCurrentUserResponse(response);
        this.applyRoleToMenu(apiRole ?? this.extractRoleFromToken(accessToken));
      },
      error: () => {
        this.applyRoleToMenu(this.extractRoleFromToken(accessToken));
      }
    });
  }

  private getAccessToken(): string | null {
    const storedToken = this.tokenStorage.get()?.trim();
    const fallbackToken = environment.mockToken?.trim();

    return storedToken || fallbackToken || null;
  }

  private applyRoleToMenu(role: string | null | undefined): void {
    this.nav.set(
      this.isAdminRole(role) ? this.baseNav : this.getDefaultNav()
    );
  }

  private getDefaultNav(): NavItem[] {
    return this.baseNav.filter((item) => item.route !== this.adminRoute);
  }

  private isAdminRole(role: string | null | undefined): boolean {
    const normalizedRole = role?.trim().toUpperCase();
    return normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN';
  }

  private extractRoleFromCurrentUserResponse(response: unknown): string | null {
    const currentUser = response as {
      role?: string;
      roles?: string[];
      data?: {
        role?: string;
        roles?: string[];
        user?: {
          role?: string;
        };
      };
      user?: {
        role?: string;
      };
    };

    if (typeof currentUser?.role === 'string') {
      return currentUser.role;
    }

    if (typeof currentUser?.data?.role === 'string') {
      return currentUser.data.role;
    }

    if (typeof currentUser?.user?.role === 'string') {
      return currentUser.user.role;
    }

    if (typeof currentUser?.data?.user?.role === 'string') {
      return currentUser.data.user.role;
    }

    if (Array.isArray(currentUser?.roles) && currentUser.roles.length > 0) {
      return currentUser.roles[0];
    }

    if (Array.isArray(currentUser?.data?.roles) && currentUser.data.roles.length > 0) {
      return currentUser.data.roles[0];
    }

    return null;
  }

  private extractRoleFromToken(token: string): string | null {
    try {
      const normalizedToken = token.startsWith('Bearer ')
        ? token.substring(7).trim()
        : token;

      const tokenParts = normalizedToken.split('.');

      if (tokenParts.length < 2) {
        return null;
      }

      const payload = JSON.parse(this.decodeBase64Url(tokenParts[1])) as {
        role?: string;
        roles?: string[];
      };

      if (typeof payload.role === 'string') {
        return payload.role;
      }

      if (Array.isArray(payload.roles) && payload.roles.length > 0) {
        return payload.roles[0];
      }

      return null;
    } catch {
      return null;
    }
  }

  private decodeBase64Url(value: string): string {
    const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/');
    const paddedValue = normalizedValue.padEnd(
      normalizedValue.length + ((4 - normalizedValue.length % 4) % 4),
      '='
    );

    return atob(paddedValue);
  }
}