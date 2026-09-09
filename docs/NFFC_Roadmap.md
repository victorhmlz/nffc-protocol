# NFFC Protocol — Roadmap de Proyecto

## Objetivo

Construir una DApp profesional para crear, explorar, valorar y comerciar NFFCs, empezando por Robinhood Chain pero con arquitectura agnóstica a red y proveedor.

## Fase 00 — Product Definition

- Vision.
- Scope V1.
- Non-goals.
- Terminología.
- User journeys.
- Modelo económico.
- Riesgos.
- Criterios de aceptación.

**Salida:** Product Specification.

## Fase 01 — Auditoría del proyecto existente

- Inspeccionar repositorio.
- Stack.
- dependencias.
- estructura.
- scripts.
- lint/build.
- deuda técnica.
- seguridad.
- compatibilidad con arquitectura objetivo.

**Salida:** audit report + patch si procede.

## Fase 02 — Arquitectura

Diseñar:

- frontend;
- backend;
- PostgreSQL;
- Redis;
- workers;
- indexer;
- contratos;
- adapters;
- observabilidad;
- seguridad.

Definir interfaces antes de implementar.

## Fase 03 — Design System / UI Foundation

Construir:

- tokens visuales;
- typography;
- spacing;
- cards;
- tables;
- badges;
- charts;
- buttons;
- forms;
- modals;
- wallet states;
- responsive rules.

Estética: terminal financiero premium + marketplace de collectibles.

## Fase 04 — Infraestructura

- environment management;
- config;
- logging;
- error handling;
- RPC abstraction;
- database connection;
- Redis;
- test infrastructure.

## Fase 05 — Asset Identity & Representation Registry

Crear la abstracción:

`Asset Identity → Provider → Network → Representation`.

Implementar Robinhood adapter.

Sincronizar activos activos oficiales.

Validar contract addresses.

## Fase 06 — NFFC Smart Contract

Implementar:

- ERC-721;
- immutable composition;
- component validation;
- 1–20 components;
- 10,000 BPS;
- registry verification;
- events;
- access control.

## Fase 07 — Collections

Implementar:

- collection model;
- collection creation;
- configurable creation fee;
- component-based fee calculation;
- creator ownership;
- collection metadata.

## Fase 08 — Metadata

Implementar metadata estática + campos dinámicos derivados.

No almacenar datos de mercado volátiles como verdad permanente.

## Fase 09 — Dynamic NFFC

Implementar:

- Reference Value;
- performance;
- composition visualization;
- rarity;
- dynamic artwork hooks si procede.

## Fase 10 — Wallet

- wagmi/viem;
- Robinhood Wallet;
- generic EVM wallets;
- network detection;
- transaction state machine.

## Fase 11 — Create UI

Flujo:

1. Basic information.
2. Select assets.
3. Set weights.
4. Validate.
5. Preview.
6. Calculate fees.
7. Mint.

## Fase 12 — Mint Flow

- simulation;
- signature;
- submission;
- confirmation;
- error states;
- receipt;
- success page.

## Fase 13 — Marketplace Contract

Implementar:

- list;
- cancel;
- buy;
- configurable fees;
- safe transfer;
- reentrancy protection.

## Fase 14 — Marketplace UI

- Explore.
- Search.
- Filters.
- Sorting.
- Cards.
- Listings.
- Purchase modal.
- Transaction feedback.

## Fase 15 — NFFC Detail

- artwork;
- reference value;
- performance;
- composition;
- activity;
- ownership;
- listing;
- offer.

## Fase 16 — Price Engine

Integrar fuentes oficiales.

Normalizar:

- decimals;
- timestamp;
- source;
- multiplier;
- raw price;
- normalized price.

## Fase 17 — NAV Engine

Calcular y persistir:

- current reference NAV;
- historical NAV;
- performance windows.

## Fase 18 — Blockchain Indexer

Eventos:

- Transfer;
- Mint;
- ListingCreated;
- ListingCancelled;
- Sale;
- OfferCreated;
- OfferAccepted.

Reprocesamiento idempotente.

## Fase 19 — Portfolio

- owned NFFCs;
- reference value;
- performance;
- exposure;
- collections.

## Fase 20 — Activity

Timeline de:

- mint;
- sale;
- transfer;
- listing;
- offer.

## Fase 21 — Profile

- created;
- owned;
- collected;
- listed;
- activity.

## Fase 22 — Search

Buscar:

- NFFCs;
- assets;
- collections;
- wallets.

## Fase 23 — Offers

- create;
- accept;
- cancel;
- expiry;
- UI;
- indexing.

## Fase 24 — Fees

- collection creation fees;
- mint fees;
- marketplace fee;
- creator royalty;
- admin configuration;
- fee preview.

## Fase 25 — Security

- contract review;
- access control;
- reentrancy;
- signature safety;
- frontend security;
- backend validation;
- rate limits;
- threat model.

## Fase 26 — Admin

- assets;
- representations;
- collections;
- reports;
- listings;
- users;
- fees;
- system health.

## Fase 27 — Error Handling

Unificar:

- wallet rejected;
- insufficient funds;
- wrong network;
- reverted transaction;
- RPC unavailable;
- indexer lag;
- API unavailable.

## Fase 28 — Responsive / Accessibility

Desktop-first pero responsive.

Validar keyboard navigation, focus, contrast y mobile.

## Fase 29 — Design Cleanup

Eliminar inconsistencias y deuda visual.

## Fase 30 — Testnet

- deployment;
- verification;
- seed data;
- test assets;
- end-to-end.

## Fase 31 — QA

Unit + integration + E2E + regression.

## Fase 32 — Performance

- caching;
- pagination;
- indexes;
- image optimization;
- SSR/ISR/RSC;
- RPC optimization.

## Fase 33 — Observability

- structured logs;
- metrics;
- alerts;
- indexer health;
- RPC health;
- failed transaction monitoring.

## Fase 34 — Mainnet Readiness

No mainnet hasta completar:

- tests;
- security review;
- independent audit;
- multisig;
- deployment scripts;
- verification;
- monitoring;
- backups;
- emergency procedures;
- legal review appropriate to launch scope.

## Regla de ejecución

Cada TASK debe seguir:

**INSPECT → PLAN → IMPLEMENT → TEST → AUDIT → REPORT → PATCH**

Claude no puede declarar una TASK como COMPLETED si build/lint/tests relevantes fallan.

Cada TASK produce:

1. cambios de código;
2. tests;
3. documentación afectada;
4. `.patch`;
5. `TASK-XX-REPORT.md`.

