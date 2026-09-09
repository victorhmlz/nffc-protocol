# NFFC Protocol — Roadmap de Proyecto

## Changelog

**v1.1 (2026-09-09)** — parche de reconciliación con `NFFC_Development_Plan.md` v3.1 y `NFFC_Claude_Master_Prompt.md` v2.0. Numeración de Fases sin cambios.
- Fase 05 → se agrega el Crypto Adapter (BTC, ETH vía Chainlink) como parte de la misma fase que el Robinhood Adapter, no de una fase posterior.
- Regla de ejecución → se corrige el orden de STEP 6/7 para que coincida con el Master Prompt v2.0: `PULL REQUEST` reemplaza a `PATCH` como STEP 6 (ya no se generan `.patch` sueltos — el repositorio es real, en GitHub, y cada TASK entrega un Pull Request contra `main`).
- Regla de ejecución → se agrega `typecheck` a la lista de comprobaciones obligatorias (proyecto en TypeScript).

**v1.0** — versión original.

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

> Nota (v1.1): esta fase describe el caso general de un proyecto con historia previa. Para el arranque actual del repositorio (`github.com/victorhmlz/nffc-protocol`, vacío), la fase equivalente es la inicialización descrita en TASK-01 de `NFFC_Development_Plan.md` — no hay repositorio previo que auditar.

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

**Implementar Crypto Adapter (BTC, ETH vía Chainlink) en la misma fase — disponible desde V1, no como incorporación posterior.**

Sincronizar activos activos oficiales (Stock Tokens y criptomonedas nativas).

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
- dynamic artwork hooks.

> Nota (v1.1): ver `NFFC_Whitepaper.md` §16 para la especificación de las cuatro características (arte generativo, doble eje de rareza, trait de condición de mercado al mint, Estado del Mercado).

## Fase 10 — Wallet

- wagmi/viem;
- Robinhood Wallet;
- generic EVM wallets;
- network detection;
- transaction state machine.

Todas las wallets soportadas son de autocustodia — el protocolo no implementa ni ofrece custodia.

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
- composición;
- activity;
- ownership;
- listing;
- offer.

## Fase 16 — Price Engine

Integrar fuentes oficiales — Chainlink como oráculo primario en Robinhood Chain, para Stock Tokens y criptomonedas por igual.

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

**INSPECT → PLAN → IMPLEMENT → TEST → AUDIT → PULL REQUEST → REPORT**

Claude no puede declarar una TASK como COMPLETED si build/lint/typecheck/tests relevantes fallan.

Cada TASK produce:

1. cambios de código;
2. tests;
3. documentación afectada;
4. Pull Request abierto contra `main`;
5. `TASK-XX-REPORT.md`.
