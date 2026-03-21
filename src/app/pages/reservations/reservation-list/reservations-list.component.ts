import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TableCardComponent } from '../../../core/ui/table-card/table-card.component';
import { PaginationComponent, PaginationVM } from '../../../core/ui/pagination/pagination.component';
import { PageHeaderComponent } from '../../../core/ui/page-header/page-header.component';
import { FilterPanelComponent } from '../../../core/ui/filter/filter-panel.component';

type ReservationRow = {
    publicId: string;
    propertyName: string;
    channel: string;
    startAt: string;
    endAt: string;
    status: 'CONFIRMED' | 'CANCELLED' | 'BLOCKED';
    createdAt: string;
};

@Component({
    selector: 'app-reservations-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        TableCardComponent,
        PaginationComponent,
        PageHeaderComponent,
        FilterPanelComponent,
    ],
    templateUrl: './reservations-list.component.html',
    styleUrls: ['./reservations-list.component.scss'],
})
export class ReservationsListComponent {
    readonly loading = signal(false);

    private readonly pageNumber = signal(0);
    private readonly pageSize = signal(5);

    private readonly totalElements = signal(0);
    private readonly totalPages = signal(1);

    private readonly pageRows = signal<ReservationRow[]>([]);

    readonly filterForm = this.fb.group({
        query: [''],
        status: [''],
    });

    readonly rows = computed(() => this.pageRows());

    readonly paginationVm = computed<PaginationVM>(() => ({
        page: this.pageNumber(),
        size: this.pageSize(),
        totalElements: this.totalElements(),
        totalPages: this.totalPages(),
    }));

    constructor(
        private readonly router: Router,
        private readonly fb: FormBuilder,
        private readonly destroyRef: DestroyRef
    ) {
        this.filterForm.valueChanges
            .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.pageNumber.set(0);
                this.load();
            });

        this.load();
    }

    load() {
        this.loading.set(true);

        // ✅ MOCK por enquanto (no próximo passo ligamos no ReservationService)
        const mock: ReservationRow[] = [
            {
                publicId: '11111111-1111-1111-1111-111111111111',
                propertyName: 'Apto Central',
                channel: 'Airbnb',
                startAt: '2026-02-20T12:00:00Z',
                endAt: '2026-02-23T12:00:00Z',
                status: 'CONFIRMED',
                createdAt: '2026-02-01T10:00:00Z',
            },
            {
                publicId: '22222222-2222-2222-2222-222222222222',
                propertyName: 'Casa Praia',
                channel: 'Booking',
                startAt: '2026-03-02T12:00:00Z',
                endAt: '2026-03-05T12:00:00Z',
                status: 'BLOCKED',
                createdAt: '2026-02-03T10:00:00Z',
            },
            {
                publicId: '33333333-3333-3333-3333-333333333333',
                propertyName: 'Studio Centro',
                channel: 'VRBO',
                startAt: '2026-02-10T12:00:00Z',
                endAt: '2026-02-12T12:00:00Z',
                status: 'CANCELLED',
                createdAt: '2026-02-02T10:00:00Z',
            },
        ];

        // Simula paginação (mock)
        const requestPage = this.pageNumber();
        const requestSize = this.pageSize();

        const filterValues = this.filterForm.getRawValue();
        const query = (filterValues.query ?? '').trim().toLowerCase();
        const status = (filterValues.status ?? '').trim();

        const filtered = mock.filter((item) => {
            const matchesQuery =
                !query ||
                item.propertyName.toLowerCase().includes(query) ||
                item.channel.toLowerCase().includes(query) ||
                item.publicId.toLowerCase().includes(query);

            const matchesStatus = !status || item.status === status;

            return matchesQuery && matchesStatus;
        });

        const startIndex = requestPage * requestSize;
        const pageContent = filtered.slice(startIndex, startIndex + requestSize);

        this.pageRows.set(pageContent);
        this.totalElements.set(filtered.length);
        this.totalPages.set(Math.max(1, Math.ceil(filtered.length / requestSize)));

        this.loading.set(false);
    }

    onPageChange(nextPage: number) {
        if (nextPage === this.pageNumber()) return;
        this.pageNumber.set(nextPage);
        this.load();
    }

    onSizeChange(nextSize: number) {
        if (nextSize === this.pageSize()) return;
        this.pageSize.set(nextSize);
        this.pageNumber.set(0);
        this.load();
    }

    clearFilters() {
        this.filterForm.reset({ query: '', status: '' });
        this.pageNumber.set(0);
        this.load();
    }

    edit(publicId: string) {
        this.router.navigate(['/app/reservations', publicId, 'edit']);
    }

    statusLabel(status: ReservationRow['status']) {
        switch (status) {
            case 'CONFIRMED':
                return 'Confirmada';
            case 'CANCELLED':
                return 'Cancelada';
            case 'BLOCKED':
                return 'Bloqueio';
            default:
                return status;
        }
    }

    readonly activeFiltersCount = computed(() => {
        const filterValues = this.filterForm.value;
        const query = (filterValues.query ?? '').trim();
        const status = (filterValues.status ?? '').trim();
        return (query ? 1 : 0) + (status ? 1 : 0);
    });
}
