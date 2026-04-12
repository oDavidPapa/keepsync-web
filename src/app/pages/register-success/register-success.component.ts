import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './register-success.component.html',
  styleUrls: ['../register/register.component.scss', './register-success.component.scss'],
})
export class RegisterSuccessComponent {
  readonly helperMessage = signal<string | null>(null);

  constructor(private readonly router: Router) {}

  startUsingSystem(): void {
    void this.router.navigate(['/login']);
  }

  buyPlan(): void {
    this.helperMessage.set(
      'A area de planos estara disponivel em breve. Enquanto isso, voce ja pode entrar e usar o sistema gratuitamente.'
    );
  }
}
