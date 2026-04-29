# KeepsyncWeb

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.7.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## KeepSync specific notes

- Support area includes:
  - `Fale Conosco`
  - `Exclusao de Conta`
  - `Apoio ao Anfitriao`
- `Apoio ao Anfitriao` now supports one editable public guest guide per property.
- Host guide editing flow now uses:
  - property selector (`select`) with count
  - selected-property highlight to reduce mistakes
  - top-right publish button with confirmation (`Publicar` / `Despublicar`) in `Guia publico por propriedade` (without wrapper bar)
  - publication status (`Publicado e acessivel` + `Ultima atualizacao`) shown in the link card below URL and above link/PDF actions
  - link actions (`Copiar`, `Abrir link`, `Gerar PDF`)
- Guide form is organized in sections (`Identificacao`, `Acesso e Wi-Fi`, `Horarios`, `Regras e dicas`, `Suporte e localizacao`).
- In host guide editor, larger textareas are applied for `Mensagem de boas-vindas` and `Regras da casa`.
- In host guide editor, `Instrucoes de check-in` and `Instrucoes de check-out` are displayed side by side on desktop with taller editing area.
- Guide content section shows orange helper text: `Edite conforme achar necessário.`
- Guide location uses Google Maps link field (stored in `emergencyContact` for compatibility).
- Host guide contact field is focused on WhatsApp (cellphone with input mask).
- Public guest guide displays host name and WhatsApp contact in the footer.
- Public guest guide includes section icons and print-optimized `Gerar PDF` action.
- Public guest guide route:
  - `/guia/:publicSlug`
- Default starter copy (welcome/check-in/check-out/rules/local tips) is seeded by backend when a property guide is created for the first time.
- Host support screen empty state (when there are no properties) now follows the same icon/title/subtitle visual pattern used in other screens.
- Main layout now enforces first-access terms acceptance modal (blocking overlay) when backend signals `termsAcceptanceRequired=true`.
- Terms modal allows `Aceitar e continuar` (calls `POST /v1/users/me/terms/accept`) or `Sair` (logout).
- Terms modal visual updated to a cleaner style without visible borders on dialog/content separators.
- Terms modal now uses softer typography colors, orange title/acceptance label, and no visible terms-version line.
- Billing/plan checkout flow:
  - checkout page route: `/app/billing/checkout`
  - only monthly billing is available in the current UI (no yearly option)
  - displayed prices:
    - `BASICO`: `R$ 79,90 / mes`
    - `PRO`: `R$ 149,90 / mes`
  - plan cards show operational limits and sync cadence:
    - `BASICO`: up to 3 properties, up to 3 channels per property, auto sync each 10 minutes, manual sync cooldown 3 minutes
    - `PRO`: unlimited properties, unlimited channels per property, auto sync each 2 minutes, manual sync cooldown 1 minute
  - settings screen plan CTA is contextual:
    - `FREE` user: `Contratar Plano`
    - paid user: `Gerenciar Plano`
  - in checkout top actions, `Voltar para Configuracoes` appears before `Gerenciar assinatura no Stripe`
