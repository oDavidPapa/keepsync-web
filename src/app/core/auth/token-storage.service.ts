import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly KEY = 'access_token';

  get(): string | null {
    const token = localStorage.getItem(this.KEY)?.trim();
    return token ? token : null;
  }

  getValidToken(): string | null {
    const token = this.get();

    if (!token) {
      return null;
    }

    if (this.isExpired(token)) {
      this.clear();
      return null;
    }

    return token;
  }

  set(token: string): void {
    localStorage.setItem(this.KEY, token.trim());
  }

  clear(): void {
    localStorage.removeItem(this.KEY);
  }

  has(): boolean {
    return !!this.get();
  }

  hasValidToken(): boolean {
    return !!this.getValidToken();
  }

  private isExpired(token: string): boolean {
    try {
      const [, payloadSegment] = token.split('.');
      if (!payloadSegment) {
        return true;
      }

      const normalizedValue = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const paddedValue = normalizedValue.padEnd(
        normalizedValue.length + ((4 - normalizedValue.length % 4) % 4),
        '='
      );
      const payload = JSON.parse(atob(paddedValue)) as { exp?: number };

      return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
}
