# Contexto de Continuidade - Proximos Passos do Projeto

Este arquivo organiza, em passos numerados, os itens que ainda faltam para concluir a evolucao do sistema KeepSync.

Objetivo deste documento:

- servir como backlog estruturado de continuidade do projeto
- permitir solicitacoes futuras no formato `execute o PASSO X`
- registrar escopo, entregas e observacoes de cada frente restante

A ideia e simples:

- cada passo abaixo representa uma frente relevante do projeto
- cada passo foi descrito com objetivo, escopo, entregas esperadas e observacoes
- em atendimentos futuros, voce pode pedir diretamente algo como:
  - `execute o PASSO 1`
  - `vamos implementar o PASSO 4`
  - `quero detalhar antes o PASSO 7`

Importante:

- este arquivo serve como roteiro funcional e tecnico
- o backend de contexto pode continuar sendo usado como referencia
- quando houver integracoes reais externas, elas devem ser validadas no backend real

---

## PASSO 1 - Gerenciamento de Notificacoes

### Objetivo

Estruturar uma area funcional no sistema para que o usuario consiga visualizar, configurar e controlar os eventos que geram notificacoes.

### Problema que esse passo resolve

Hoje o sistema ja possui parte da estrutura de preferencias, mas ainda falta consolidar uma experiencia de gerenciamento mais completa, clara e operacional para o usuario final.

### Escopo esperado

- criar uma tela ou modulo de gerenciamento de notificacoes
- permitir que o usuario visualize quais eventos podem gerar notificacoes
- organizar as notificacoes por categoria ou tipo de evento
- permitir ativar ou desativar notificacoes por canal
- permitir definir comportamento por contexto:
  - global
  - por propriedade
  - por tipo de evento

### Eventos esperados inicialmente

- conflito aberto
- conflito resolvido
- reserva confirmada
- reserva cancelada
- alteracao importante de sincronizacao
- falha de leitura de calendario
- inatividade de sincronizacao

### Entregas esperadas

- front-end da tela de notificacoes
- contratos claros no front e no backend
- persistencia das preferencias do usuario
- feedback visual de sucesso e erro

### Observacoes

- este passo foca no gerenciamento funcional
- o disparo mais sofisticado por canais especificos pode ser aprofundado nos passos 2 e 3

---

## PASSO 2 - Melhoria nas Notificacoes por E-mail e SMS

### Objetivo

Evoluir a camada de notificacoes para canais reais, principalmente e-mail e SMS, com melhor qualidade operacional.

### Problema que esse passo resolve

Mesmo com preferencias salvas, ainda falta tornar o envio realmente robusto, configuravel e confiavel.

### Escopo esperado

- revisar a arquitetura de envio de notificacoes
- criar servicos separados por canal
- permitir templates por tipo de evento
- melhorar o conteudo das mensagens
- criar logs de tentativas de envio
- registrar status de entrega:
  - pendente
  - enviado
  - falhou
  - reprocessado

### Funcionalidades desejadas

- envio de e-mail com templates mais claros
- envio de SMS para eventos criticos
- configuracao de remetente e parametros externos
- possibilidade de reenvio
- cooldown ou limite de repeticao para evitar spam

### Entregas esperadas

- servico de notificacoes por e-mail
- servico de notificacoes por SMS
- estrutura de templates
- historico ou log de envios

### Observacoes

- esse passo pode exigir integracao com provedores externos reais
- e recomendado separar bem a logica de disparo da logica de negocio

---

## PASSO 3 - Integracao com WhatsApp

### Objetivo

Adicionar o canal WhatsApp como meio oficial de notificacao e comunicacao do sistema.

### Problema que esse passo resolve

Para a operacao de hospedagem, WhatsApp tende a ser um dos canais mais importantes e praticos. Hoje ele ainda nao esta consolidado como integracao real no projeto.

### Escopo esperado

- integrar com provedor de WhatsApp
- criar camada de envio dedicada
- suportar templates padronizados
- permitir disparo a partir de eventos do sistema
- permitir disparo manual em alguns contextos futuros

### Casos de uso principais

- aviso de conflito
- alerta de alteracao de reserva
- aviso de problema de sincronizacao
- confirmacao de operacoes importantes

### Entregas esperadas

- contrato de integracao com WhatsApp
- servico no backend para envio
- configuracao no front para ativacao do canal
- tratamento de falha, reenvio e logs

### Observacoes

- esse passo deve considerar compliance e custo por envio
- futuramente ele conversa diretamente com o PASSO 9, que trata da area de apoio com mensagens pre-prontas

---

## PASSO 4 - Listagens Administrativas de Clientes

### Objetivo

Dar ao administrador uma visao completa dos clientes cadastrados no sistema, com dados suficientes para gestao operacional, comercial e de suporte.

### Problema que esse passo resolve

Hoje o sistema ja possui base para usuarios, mas ainda nao oferece a experiencia administrativa completa para acompanhamento de clientes e contas.

### Escopo esperado

- listar todos os clientes para usuarios com perfil ADMIN
- exibir dados relevantes do cliente
- permitir filtro, busca e ordenacao
- permitir visualizacao do status da conta e do plano
- permitir administracao de status do cliente

### Dados relevantes esperados na listagem

- nome completo
- e-mail
- celular
- CPF
- perfil
- plano
- status da conta
- data de cadastro
- ultima atualizacao
- quantidade de propriedades ou reservas, se fizer sentido

### Possiveis acoes administrativas

- ativar ou inativar usuario
- visualizar detalhes do cliente
- filtrar por plano
- filtrar por status
- buscar por nome, e-mail ou CPF

### Entregas esperadas

- endpoint administrativo de listagem
- tela administrativa consistente com o restante do sistema
- regras de acesso exclusivas para ADMIN

### Observacoes

- reforcar no backend que apenas ADMIN acessa esse recurso
- em nenhuma hipotese o front deve ser a unica barreira de seguranca

---

## PASSO 5 - Fluxo de Recuperacao de Senha

### Objetivo

Criar um fluxo real e completo de recuperacao de senha para usuarios que esqueceram a credencial.

### Problema que esse passo resolve

Hoje existem indicoes e partes do fluxo, mas ainda falta uma experiencia completa, segura e coerente para recuperacao de acesso.

### Escopo esperado

- tela de solicitacao de recuperacao de senha
- envio de token seguro por e-mail
- tela de redefinicao de senha
- expiracao do token
- invalidacao apos uso
- mensagens adequadas de sucesso e erro

### Fluxo desejado

1. usuario informa o e-mail
2. sistema envia link ou token de redefinicao
3. usuario abre a tela de redefinicao
4. usuario define nova senha
5. sistema invalida o token e confirma a alteracao

### Entregas esperadas

- endpoints de solicitacao e redefinicao
- telas no front
- envio real de e-mail
- protecoes contra abuso

### Observacoes

- evitar vazar se um e-mail existe ou nao no sistema
- usar token com expiracao curta
- registrar logs de seguranca

---

## PASSO 6 - Permissoes do Sistema por Plano

### Objetivo

Controlar funcionalidades do sistema de acordo com o plano contratado pelo cliente.

### Problema que esse passo resolve

Atualmente o sistema reconhece plano em parte da modelagem, mas ainda nao existe uma camada funcional robusta de permissao por plano.

### Escopo esperado

- mapear funcionalidades por plano
- bloquear ou liberar recursos conforme o plano
- refletir isso tanto no backend quanto no front
- oferecer mensagens claras quando o usuario tentar acessar recurso indisponivel

### Exemplos de regras futuras

- limite de propriedades por plano
- limite de usuarios por conta
- canais disponiveis por plano
- quantidade de notificacoes
- dashboard avancado apenas em planos superiores
- modulos premium bloqueados para plano gratuito

### Entregas esperadas

- matriz de permissoes por plano
- validacao de permissao no backend
- comportamento visual no front
- mensagens de upgrade quando necessario

### Observacoes

- a regra principal deve ficar no backend
- o front deve refletir a regra, nao substitui-la

---

## PASSO 7 - Dashboard com Estatisticas e Informacoes Relevantes

### Objetivo

Construir um dashboard util de verdade para a operacao do usuario, com dados relevantes de reservas, conflitos e desempenho.

### Problema que esse passo resolve

O dashboard atual ainda nao entrega uma visao executiva e operacional suficientemente rica para o produto.

### Escopo esperado

- indicadores principais de reservas
- informacoes de conflitos
- propriedades com maior movimento
- ocupacao por periodo
- reservas futuras
- cancelamentos
- sincronizacoes falhas ou pendentes

### Indicadores sugeridos

- total de reservas no periodo
- reservas confirmadas
- reservas canceladas
- conflitos abertos
- propriedades ativas
- ocupacao do mes
- receita estimada, se essa informacao existir

### Entregas esperadas

- nova composicao do dashboard
- endpoints ou agregacoes no backend
- cards e graficos relevantes
- filtros por periodo e propriedade

### Observacoes

- o dashboard deve ajudar tomada de decisao
- evitar numeros decorativos sem utilidade pratica

---

## PASSO 8 - Testes Unitarios do Sistema

### Objetivo

Criar cobertura de testes unitarios para reduzir regressao e aumentar confianca na evolucao do projeto.

### Problema que esse passo resolve

O sistema ainda precisa de uma base de testes mais consistente para crescer com seguranca.

### Escopo esperado

- testes de componentes principais no front
- testes de servicos e regras de negocio no front
- testes de servicos no backend
- testes de validacoes importantes
- testes de autenticacao, cadastro e permissoes

### Prioridades recomendadas

1. autenticacao e cadastro
2. guardas e interceptors
3. validadores importantes como CPF
4. servicos de usuario
5. notificacoes
6. dashboard e regras de negocio

### Entregas esperadas

- suite minima de testes no front
- suite minima de testes no backend
- documentacao de como executar

### Observacoes

- priorizar testes de partes criticas primeiro
- nao buscar cobertura alta por vaidade, e sim cobertura util

---

## PASSO 9 - Gerenciamento de Apoio com Mensagens Pre-prontas

### Objetivo

Criar um modulo de apoio para que o usuario envie mensagens pre-prontas a hospedes ou contatos operacionais.

### Problema que esse passo resolve

Na operacao de aluguel por temporada, varios contatos sao repetitivos. O sistema pode economizar muito tempo com mensagens estruturadas para uso rapido.

### Escopo esperado

- modulo ou tela de apoio
- cadastro de mensagens prontas
- categorias de mensagem
- parametrizacao de placeholders
- disparo para numero de celular informado
- futura integracao com WhatsApp

### Exemplos de mensagens

- instrucoes de check-in
- localizacao do apartamento
- regras da casa
- orientacoes de checkout
- wifi e acesso
- observacoes gerais da hospedagem

### Funcionalidades desejadas

- criar mensagem modelo
- editar mensagem modelo
- duplicar mensagem
- organizar por categoria
- selecionar mensagem e enviar para um numero
- usar variaveis dinamicas como:
  - nome do hospede
  - nome da propriedade
  - data de check-in
  - endereco

### Entregas esperadas

- tela de gerenciamento de mensagens prontas
- backend para CRUD das mensagens
- mecanismo de envio ou preparacao de envio
- integracao futura com WhatsApp e outros canais

### Observacoes

- esse modulo tem forte conexao com notificacoes e WhatsApp
- pode ser evoluido em etapas:
  - primeiro CRUD de modelos
  - depois disparo
  - depois integracao real com canal externo

---

## Ordem Recomendada de Execucao

Se for necessario seguir uma ordem mais racional para implementacao futura, a sugestao e:

1. PASSO 5 - Fluxo de Recuperacao de Senha
2. PASSO 4 - Listagens Administrativas de Clientes
3. PASSO 6 - Permissoes por Plano
4. PASSO 1 - Gerenciamento de Notificacoes
5. PASSO 2 - Melhoria nas Notificacoes por E-mail e SMS
6. PASSO 3 - Integracao com WhatsApp
7. PASSO 9 - Gerenciamento de Apoio
8. PASSO 7 - Dashboard com Estatisticas
9. PASSO 8 - Testes Unitarios

---

## Como Pedir Continuacao Depois

Exemplos de uso futuro:

- `Execute o PASSO 1 do AI_CONTEXT_NEXT_STEPS_2026-04-12.md`
- `Quero iniciar o PASSO 4`
- `Antes de implementar, detalhe tecnicamente o PASSO 6`
- `Implemente apenas o front do PASSO 9`
