import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { PropertyService } from '../../../modules/properties/api/property.service';
import { PropertyResponse } from '../../../modules/properties/api/property.models';
import { apiErrorMessage } from '../../../modules/properties/api/api-error.util';
import { ToastService } from '../../../core/ui/toast/toast.service';
import { ConfirmService } from '../../../core/ui/confirm/confirm.service';

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
    const queryText = (this.filterForm.value.q ?? '').toLowerCase().trim();
    const country = (this.filterForm.value.country ?? '').trim();

    return this.serverRows()
      .filter(property =>
        !queryText ||
        property.name.toLowerCase().includes(queryText) ||
        (property.city ?? '').toLowerCase().includes(queryText)
      )
      .filter(property => !country || (property.country ?? '') === country);
  });

  constructor(
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly toast: ToastService,
    private readonly confirm: ConfirmService,
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
      next: (page) => {
        // ✅ NÃO força active=true. Usa exatamente o que veio do backend.
        this.serverRows.set(page.content ?? []);
        this.totalElements.set(page.totalElements ?? 0);
        this.totalPages.set(page.totalPages ?? 0);
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
    this.confirm.ask({
      title: 'Excluir propriedade',
      message: `Deseja excluir a propriedade "${row.name}"?`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      tone: 'danger',
      hint: 'Essa ação não pode ser desfeita.',
    }).subscribe((confirmed) => {
      if (!confirmed) return;

      this.propertyService.delete(row.publicId).subscribe({
        next: () => {
          this.toast.success('Propriedade excluída.');
          this.load();
        },
        error: (err) => {
          this.toast.error(apiErrorMessage(err, 'Não foi possível excluir a propriedade.'));
          console.error(err);
        }
      });
    });
  }

  // ✅ SEM confirmação na inativação/ativação
  toggleActive(row: PropertyResponse) {
    this.propertyService.toggleActive(row.publicId).subscribe({
      next: (updated) => {
        // ✅ Atualiza a linha local imediatamente (sem depender do reload)
        this.serverRows.update((current) =>
          current.map((property) =>
            property.publicId === updated.publicId ? updated : property
          )
        );

        this.toast.success(updated.active ? 'Propriedade ativada.' : 'Propriedade inativada.');
      },
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Não foi possível atualizar o status.'));
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
