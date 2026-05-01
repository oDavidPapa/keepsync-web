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
      'Verifique a caixa de spam/lixo eletronico e tente novamente em alguns minutos. Voce tambem pode pedir reenvio na tela de login.'
    );
  }
}
