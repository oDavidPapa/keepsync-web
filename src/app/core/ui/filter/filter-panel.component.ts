import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-panel.component.html',
  styleUrls: ['./filter-panel.component.scss'],
})
export class FilterPanelComponent {
  @Input() title = 'Filtros';

  @Input() defaultOpen = false;
  @Input() activeCount = 0;
  @Input() clearText = 'Limpar';
  @Input() showClear = true;

  readonly open = signal(false);

  ngOnInit() {
    this.open.set(!!this.defaultOpen);
  }

  toggle() {
    this.open.update(v => !v);
  }
}
