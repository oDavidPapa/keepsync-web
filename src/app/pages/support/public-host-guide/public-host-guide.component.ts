import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { PublicPropertyHostGuideResponse } from '../../../modules/properties/api/property.models';
import { PropertyService } from '../../../modules/properties/api/property.service';

@Component({
  selector: 'app-public-host-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-host-guide.component.html',
  styleUrl: './public-host-guide.component.scss',
})
export class PublicHostGuideComponent {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly guide = signal<PublicPropertyHostGuideResponse | null>(null);

  readonly title = computed(() => {
    const loadedGuide = this.guide();
    if (!loadedGuide) {
      return 'Cartilha do Hospede';
    }

    const customTitle = String(loadedGuide.title ?? '').trim();
    return customTitle || loadedGuide.propertyName || 'Cartilha do Hospede';
  });

  readonly fullAddress = computed(() => {
    const loadedGuide = this.guide();
    if (!loadedGuide) {
      return '';
    }

    const parts = [
      loadedGuide.addressLine1,
      loadedGuide.addressLine2,
      loadedGuide.city,
      loadedGuide.state,
      loadedGuide.country,
    ]
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);

    return parts.join(' - ');
  });

  readonly mapsHref = computed(() => {
    const loadedGuide = this.guide();
    const configuredMapsLink = String(loadedGuide?.emergencyContact ?? '').trim();
    if (configuredMapsLink) {
      if (configuredMapsLink.startsWith('http://') || configuredMapsLink.startsWith('https://')) {
        return configuredMapsLink;
      }
      return `https://${configuredMapsLink}`;
    }

    const address = this.fullAddress();
    if (!address) {
      return '';
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  });

  readonly wazeHref = computed(() => {
    const address = this.fullAddress();
    if (!address) {
      return '';
    }

    return `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  });

  readonly whatsappDigits = computed(() => {
    const loadedGuide = this.guide();
    const whatsappValue = String(loadedGuide?.supportWhatsapp ?? '').trim();
    if (!whatsappValue) {
      return '';
    }

    return whatsappValue.replace(/\D/g, '');
  });

  readonly hasWhatsappContact = computed(() => {
    const digitsOnly = this.whatsappDigits();
    return digitsOnly.length >= 10;
  });

  readonly whatsappHref = computed(() => {
    if (!this.hasWhatsappContact()) {
      return '';
    }

    return `https://wa.me/${this.whatsappDigits()}`;
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly propertyService: PropertyService
  ) {
    this.loadGuide();
  }

  exportPdf() {
    if (typeof window === 'undefined') {
      return;
    }

    const currentDocumentTitle = document.title;
    document.title = this.title();
    window.print();
    setTimeout(() => {
      document.title = currentDocumentTitle;
    }, 250);
  }

  private loadGuide() {
    const publicSlug = String(this.route.snapshot.paramMap.get('publicSlug') ?? '').trim();
    if (!publicSlug) {
      this.error.set('Link invalido.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.propertyService.getPublicHostGuide(publicSlug).subscribe({
      next: (response) => {
        this.guide.set(response);
        this.loading.set(false);

        const shouldAutoPrint = this.route.snapshot.queryParamMap.get('print') === '1';
        if (shouldAutoPrint) {
          setTimeout(() => this.exportPdf(), 250);
        }
      },
      error: () => {
        this.error.set('Cartilha nao encontrada ou ainda nao publicada.');
        this.loading.set(false);
      },
    });
  }
}
