import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkYXZpZHMucGFwYUBvdXRsb29rLmNvbSIsInVpZCI6MSwicGlkIjoiYzZjZTA0NGEtZDU0NS00OGE5LTg3YWMtMjQwNTNlMDQxNTExIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3NzA0OTcxMTQsImV4cCI6MTc3MDUwNDMxNH0.46F-4gTY2eJGDzTm3NcasiB39UILKahx92eEZbdnOpI';

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
