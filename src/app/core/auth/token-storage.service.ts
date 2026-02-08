import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly KEY = 'access_token';

  get(): string | null {
    return localStorage.getItem(this.KEY);
  }

  set(token: string): void {
    localStorage.setItem(this.KEY, token);
  }

  clear(): void {
    localStorage.removeItem(this.KEY);
  }

  has(): boolean {
    return !!this.get();
  }
}
