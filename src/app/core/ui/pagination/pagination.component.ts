import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type PageSizeOption = 5 | 10 | 20 | 50 | 100;

export type PaginationVM = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
})
export class PaginationComponent {
  @Input({ required: true }) vm!: PaginationVM;

  @Input() sizeOptions: PageSizeOption[] = [5, 10, 20];
  @Input() disabled = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() sizeChange = new EventEmitter<number>();

  get isFirst(): boolean {
    return (this.vm?.page ?? 0) <= 0;
  }

  get isLast(): boolean {
    return (this.vm?.page ?? 0) >= Math.max(0, (this.vm?.totalPages ?? 1) - 1);
  }

  get rangeLabel(): string {
    const total = this.vm?.totalElements ?? 0;
    if (total <= 0) return '0 itens';

    const page = this.vm.page;
    const size = this.vm.size;

    const start = page * size + 1;
    const end = Math.min((page + 1) * size, total);

    return `${start}-${end} de ${total}`;
  }

  prev() {
    if (this.disabled || this.isFirst) return;
    this.pageChange.emit(this.vm.page - 1);
  }

  next() {
    if (this.disabled || this.isLast) return;
    this.pageChange.emit(this.vm.page + 1);
  }

  onSizeChangeEvent(event: Event) {
    if (this.disabled) return;

    const target = event.target as HTMLSelectElement | null;
    const nextSize = Number(target?.value);

    if (!Number.isFinite(nextSize) || nextSize <= 0) return;

    this.sizeChange.emit(nextSize);
    this.pageChange.emit(0);
  }
}
