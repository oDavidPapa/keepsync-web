import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './legal-pages.component.scss',
})
export class PrivacyPolicyComponent {
  readonly updatedAt = '01/05/2026';
  readonly sections: LegalSection[] = [
    {
      title: '1. Sobre esta politica',
      paragraphs: [
        'Esta Politica descreve como o KeepSync coleta, utiliza, compartilha, armazena e protege dados pessoais no contexto de uso da plataforma, em conformidade com a legislacao aplicavel, incluindo a LGPD.',
      ],
    },
    {
      title: '2. Dados pessoais tratados',
      paragraphs: [
        'Podemos tratar, entre outros, os seguintes dados:',
        'O KeepSync nao trata intencionalmente dados pessoais sensiveis para a finalidade principal do servico.',
      ],
      bullets: [
        'dados de cadastro: nome, e-mail e telefone;',
        'dados da conta: perfil de acesso, plano e status de assinatura;',
        'dados operacionais: propriedades, canais, reservas, conflitos e historicos de sincronizacao;',
        'dados tecnicos e de seguranca: logs, IP, user-agent, eventos de autenticacao e uso;',
        'dados de faturamento vinculados a integracoes de pagamento (ex.: identificadores da assinatura).',
      ],
    },
    {
      title: '3. Finalidades e bases legais',
      paragraphs: [
        'Os dados sao tratados para:',
        'O tratamento pode se apoiar, conforme o caso, em execucao de contrato, legitimo interesse, cumprimento de obrigacao legal e, quando necessario, consentimento.',
      ],
      bullets: [
        'executar funcionalidades da plataforma e prestar o servico contratado;',
        'viabilizar sincronizacoes, alertas e comunicacoes operacionais;',
        'prevenir fraude, abuso, incidentes e acessos nao autorizados;',
        'cumprir obrigacoes legais e regulatorias;',
        'aprimorar a performance, confiabilidade e experiencia de uso.',
      ],
    },
    {
      title: '4. Compartilhamento de dados',
      paragraphs: [
        'Os dados podem ser compartilhados com operadores e parceiros necessarios para a operacao do servico, como:',
        'O KeepSync nao comercializa dados pessoais.',
      ],
      bullets: [
        'processamento de pagamentos e assinatura;',
        'envio de e-mails e notificacoes;',
        'provedores de infraestrutura, monitoramento e seguranca.',
      ],
    },
    {
      title: '5. Retencao e descarte',
      paragraphs: [
        'Os dados sao mantidos pelo tempo necessario para cumprir as finalidades desta Politica, atender obrigacoes legais e resguardar direitos em processos administrativos, judiciais ou arbitrais. Apos esse periodo, os dados sao eliminados ou anonimizados, quando aplicavel.',
      ],
    },
    {
      title: '6. Direitos do titular',
      paragraphs: [
        'Nos termos da LGPD, o titular pode solicitar, entre outros:',
        'As solicitacoes podem ser enviadas para o canal de contato desta Politica.',
      ],
      bullets: [
        'confirmacao da existencia de tratamento e acesso aos dados;',
        'correcao de dados incompletos, inexatos ou desatualizados;',
        'anonimizacao, bloqueio ou eliminacao de dados desnecessarios ou tratados em desconformidade;',
        'portabilidade, quando aplicavel;',
        'informacao sobre compartilhamentos, revisao de decisoes automatizadas e revogacao de consentimento.',
      ],
    },
    {
      title: '7. Cookies e tecnologias similares',
      paragraphs: [
        'O KeepSync pode utilizar cookies e tecnologias equivalentes para autenticacao, seguranca, preferencias e analise de desempenho, respeitando os requisitos legais aplicaveis.',
      ],
    },
    {
      title: '8. Seguranca da informacao',
      paragraphs: [
        'Adotamos medidas tecnicas e organizacionais para proteger dados pessoais contra acessos nao autorizados, perda, alteracao ou divulgacao indevida. Ainda assim, nenhum ambiente e totalmente imune a riscos.',
      ],
    },
    {
      title: '9. Transferencias internacionais',
      paragraphs: [
        'Quando houver uso de fornecedores com infraestrutura fora do Brasil, as transferencias internacionais observarao os mecanismos legais aplicaveis e salvaguardas adequadas de protecao de dados.',
      ],
    },
    {
      title: '10. Atualizacoes desta politica',
      paragraphs: [
        'Esta Politica pode ser atualizada periodicamente para refletir mudancas legais, tecnicas e operacionais. A versao vigente estara sempre disponivel nesta pagina.',
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
