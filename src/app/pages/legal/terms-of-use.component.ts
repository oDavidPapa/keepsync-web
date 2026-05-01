import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  bulletsSecondary?: string[];
  bulletsSecondaryLabel?: string;
};

@Component({
  selector: 'app-terms-of-use',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms-of-use.component.html',
  styleUrl: './legal-pages.component.scss',
})
export class TermsOfUseComponent {
  readonly updatedAt = '01/05/2026';
  readonly sections: LegalSection[] = [
    {
      title: '1. Sobre o servico',
      paragraphs: [
        'O KeepSync e uma plataforma de apoio a gestao de disponibilidade de propriedades por meio de sincronizacao de calendarios (iCal), acompanhamento operacional de reservas e envio de notificacoes relacionadas aos eventos da operacao.',
        'O KeepSync nao atua como intermediador de reservas, nao representa plataformas de terceiros e nao realiza cobranca em nome do usuario fora dos fluxos contratados diretamente no sistema.',
      ],
    },
    {
      title: '2. Condicoes de uso',
      paragraphs: ['Ao utilizar o KeepSync, o usuario declara que:'],
      bullets: [
        'usa a plataforma para fins legitimos de gestao operacional;',
        'fornece dados verdadeiros e atualizados;',
        'mantem a confidencialidade de suas credenciais de acesso.',
      ],
      bulletsSecondaryLabel: 'Fica proibido:',
      bulletsSecondary: [
        'usar a plataforma para spam, fraude ou qualquer atividade ilicita;',
        'tentar burlar limites tecnicos, controles de seguranca ou mecanismos antiabuso;',
        'utilizar dados pessoais de terceiros sem base legal ou autorizacao.',
      ],
    },
    {
      title: '3. Planos, cobranca e assinatura',
      paragraphs: [
        'Os recursos disponiveis podem variar por plano contratado. Assinaturas pagas podem ser processadas por parceiro de pagamento externo (Stripe), incluindo renovacao automatica, upgrade, downgrade e cancelamento conforme configuracao da assinatura.',
        'O usuario e responsavel por acompanhar os dados de faturamento e a situacao da assinatura no portal de gerenciamento informado no produto.',
      ],
    },
    {
      title: '4. Notificacoes e protecao operacional',
      paragraphs: [
        'O KeepSync pode aplicar controles de protecao para preservar a estabilidade da plataforma e evitar abuso, incluindo limitacao de taxa, bloqueios temporarios e priorizacao de eventos criticos.',
        'Essas medidas podem restringir fluxos anormais sem afetar o uso legitimo esperado da plataforma.',
      ],
    },
    {
      title: '5. Integracoes com terceiros',
      paragraphs: [
        'O funcionamento do KeepSync depende de servicos externos, como canais de reserva, provedores de notificacao, infraestrutura e processadores de pagamento. O KeepSync nao se responsabiliza por indisponibilidade, atraso, mudancas de API ou falhas desses terceiros.',
      ],
    },
    {
      title: '6. Limitacao de responsabilidade',
      paragraphs: [
        'O KeepSync e ferramenta de apoio operacional. O usuario permanece responsavel por validar reservas, disponibilidade e regras da propria operacao. O KeepSync nao responde por perdas indiretas, lucros cessantes, overbooking causado por terceiros ou danos decorrentes de uso indevido da plataforma.',
      ],
    },
    {
      title: '7. Suspensao e encerramento de conta',
      paragraphs: [
        'O KeepSync podera suspender ou encerrar acessos em caso de violacao destes Termos, uso indevido da plataforma ou comportamento que comprometa seguranca, disponibilidade ou integridade do servico.',
      ],
    },
    {
      title: '8. Propriedade intelectual',
      paragraphs: [
        'O software, interfaces, marcas, textos e demais elementos do KeepSync sao protegidos por direitos de propriedade intelectual. Nao e permitido copiar, distribuir, modificar ou explorar comercialmente esses elementos sem autorizacao expressa.',
      ],
    },
    {
      title: '9. Atualizacoes destes Termos',
      paragraphs: [
        'Estes Termos podem ser atualizados periodicamente para refletir evolucoes legais, tecnicas e operacionais. Quando aplicavel, nova versao podera exigir novo aceite para continuidade de uso.',
      ],
    },
    {
      title: '10. Lei aplicavel e foro',
      paragraphs: [
        'Estes Termos sao regidos pela legislacao brasileira. Fica eleito o foro da comarca do domicilio do controlador, salvo disposicao legal especifica em sentido diverso.',
      ],
    },
  ];
  readonly openStates = signal<boolean[]>(this.sections.map(() => true));

  toggleSection(index: number): void {
    const next = [...this.openStates()];
    next[index] = !next[index];
    this.openStates.set(next);
  }

  isOpen(index: number): boolean {
    return this.openStates()[index] ?? false;
  }
}
