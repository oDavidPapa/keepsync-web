import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  @Input() collapsed = false;
  @Output() toggleMobile = new EventEmitter<void>();
  @Output() toggleCollapse = new EventEmitter<void>();
}
