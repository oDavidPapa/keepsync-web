import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { PropertyService } from '../../../modules/properties/api/property.service';
import { PropertyResponse } from '../../../modules/properties/api/property.models';
import { apiErrorMessage } from '../../../modules/properties/api/api-error.util';

@Component({
  selector: 'app-properties-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './properties-list.component.html',
  styleUrls: ['./properties-list.component.scss'],
})
export class PropertiesListComponent {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly page = signal(0);
  readonly size = signal(10);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);

  private readonly serverRows = signal<PropertyResponse[]>([]);

  readonly filterForm = this.fb.group({
    q: [''],
    country: [''],
  });

  readonly rows = computed(() => {
    const q = (this.filterForm.value.q ?? '').toLowerCase().trim();
    const country = (this.filterForm.value.country ?? '').trim();

    return this.serverRows()
      .filter(r => !q || r.name.toLowerCase().includes(q) || (r.city ?? '').toLowerCase().includes(q))
      .filter(r => !country || (r.country ?? '') === country);
  });

  constructor(
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly propertyService: PropertyService
  ) {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.propertyService.list({
      page: this.page(),
      size: this.size(),
      sort: 'createdAt,desc',
    }).subscribe({
      next: (p) => {
        this.serverRows.set(p.content ?? []);
        this.totalElements.set(p.totalElements ?? 0);
        this.totalPages.set(p.totalPages ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiErrorMessage(err, 'Falha ao carregar propriedades.'));
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  goNew() {
    this.router.navigate(['/app/properties/new']);
  }

  edit(publicId: string) {
    this.router.navigate(['/app/properties', publicId, 'edit']);
  }

  remove(row: PropertyResponse) {
    const ok = confirm(`Deseja excluir a propriedade "${row.name}"?`);
    if (!ok) return;

    this.propertyService.delete(row.publicId).subscribe({
      next: () => this.load(),
      error: (err) => {
        alert(apiErrorMessage(err, 'Não foi possível excluir a propriedade.'));
        console.error(err);
      }
    });
  }

  clearFilters() {
    this.filterForm.reset({ q: '', country: '' });
  }

  prevPage() {
    if (this.page() <= 0) return;
    this.page.set(this.page() - 1);
    this.load();
  }

  nextPage() {
    if (this.page() + 1 >= this.totalPages()) return;
    this.page.set(this.page() + 1);
    this.load();
  }
}
