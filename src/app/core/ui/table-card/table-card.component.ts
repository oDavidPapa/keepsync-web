import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-card.component.html',
  styleUrls: ['./table-card.component.scss'],
})
export class TableCardComponent {
  @Input() title = '';
  @Input() hasRows = false;
  @Input() loading = false;
  @Input() hasFilters = false;

}
