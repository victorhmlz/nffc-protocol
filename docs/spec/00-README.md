# NFFC Protocol — Specification (TASK-00)

**Status:** Draft for Project Lead review
**Spec version:** 0.1 (TASK-00)
**Date:** 2026-09-09
**Language:** English. Governance documents (`NFFC_Claude_Master_Prompt.md`, `NFFC_Development_Plan.md`,
`NFFC_Whitepaper.md`, `NFFC_Roadmap.md`) remain Spanish and are authoritative for product intent;
this set formalizes that intent for engineering.

---

## Purpose

TASK-00 in `NFFC_Development_Plan.md` v3.2 requires the domain and architecture to be documented
**before any production code**. This set is that documentation. It introduces no framework, no
`package.json`, and no `.sol` files — `04-contract-interfaces.md` is signatures and invariants only.
Project scaffolding is TASK-01.

## How to read this set

| # | File | Answers |
|---|------|---------|
| 00 | `00-README.md` | What these documents are, how they map to the governance docs. |
| 01 | `01-product-spec.md` | What NFFC Protocol is, what V1 does and deliberately does not do, who uses it, the economic model, the open risks. |
| 02 | `02-domain-model.md` | The six domain entities and their relationships; why Asset Identity is not Representation; the composition invariants. |
| 03 | `03-architecture.md` | System shape: dapp, API, workers, data stores, RPC, oracle; the framework-agnostic / provider-agnostic domain rule. |
| 04 | `04-contract-interfaces.md` | Interface-level contract spec: functions, events, errors, roles, invariants. No implementation. |
| 05 | `05-adapter-architecture.md` | The Provider/Network Adapter pattern; Robinhood and crypto as peers; how a third provider is added without touching core. |
| 06 | `06-fee-model.md` | The four fee types, all parameterized; where they live; how they change. No amounts. |
| 07 | `07-ux-map.md` | Surfaces, routes, the wallet transaction state machine, server-vs-client boundary, display rules. |
| 08 | `08-security-principles.md` | Contract and application security posture; threat surface; open regulatory findings. |
| 09 | `09-data-model.md` | The off-chain index schema and the rule that the database is never canonical for ownership. |
| 10 | `10-version-boundaries.md` | The V1 / V1.5 / V2 feature matrix, unambiguous. |
| 11 | `11-glossary.md` | Canonical English terminology. |

Read 01 → 02 → 10 first for scope; 03 → 04 → 05 for architecture; 06 → 07 → 08 → 09 for the
supporting models.

## Mapping to the governance documents

| Spec file | Whitepaper (`NFFC_Whitepaper.md` v1.1) | Roadmap (`NFFC_Roadmap.md` v1.1) | Development Plan (`NFFC_Development_Plan.md` v3.2) |
|---|---|---|---|
| 01 product spec | §1–4, §12, §13, §14, §15 | Fase 00 | TASK-00 |
| 02 domain model | §3, §4, §5, §6, §16 | Fase 05, Fase 06 | TASK-00, TASK-05, TASK-08, TASK-09, TASK-14 |
| 03 architecture | §5, §9 | Fase 02, Fase 04 | TASK-00, TASK-02, TASK-04 |
| 04 contract interfaces | §9, §10 | Fase 05, Fase 06, Fase 07, Fase 13, Fase 24 | TASK-05, TASK-06, TASK-07, TASK-09, TASK-10, TASK-19, TASK-30 |
| 05 adapter architecture | §5, §7 | Fase 05, Fase 16 | TASK-05, TASK-06, TASK-07, TASK-22, TASK-47 |
| 06 fee model | §6, §8, §12 | Fase 07, Fase 24 | TASK-10, TASK-30 |
| 07 UX map | §6, §8, §16 | Fase 10–15, Fase 26, Fase 27 | TASK-16, TASK-17, TASK-18, TASK-20, TASK-21, TASK-31 |
| 08 security principles | §10, §14 | Fase 25, Fase 34 | TASK-32, TASK-40 |
| 09 data model | §7, §9 | Fase 08, Fase 17, Fase 18 | TASK-11, TASK-19 mapping, TASK-23, TASK-24 |
| 10 version boundaries | §4, §11, §16, §17 | Fase 34 milestones | TASK-00, all milestone markers |
| 11 glossary | §3, §7, §16 | — | — |

### Roadmap Fase ↔ Development Plan TASK

The Roadmap numbers **phases** (Fase 00–34, milestone-level); the Development Plan numbers **tasks**
(TASK-00–47, execution-level). They are not 1:1. Approximate alignment:

| Roadmap | Development Plan |
|---|---|
| Fase 00 | TASK-00 |
| Fase 01 | TASK-01 (bootstrap — Roadmap still titles this "audit"; see KNOWN ISSUES in the TASK-00 report) |
| Fase 02 | TASK-02 |
| Fase 03 | TASK-03 |
| Fase 04 | TASK-04 |
| Fase 05 | TASK-05, TASK-06, TASK-07, TASK-08 |
| Fase 06 | TASK-09 |
| Fase 07 | TASK-10 |
| Fase 08 | TASK-11 |
| Fase 09 | TASK-12, TASK-13, TASK-14, TASK-15 |
| Fase 10 | TASK-16 |
| Fase 11 | TASK-17 |
| Fase 12 | TASK-18 |
| Fase 13 | TASK-19 |
| Fase 14 | TASK-20 |
| Fase 15 | TASK-21 |
| Fase 16 | TASK-22 |
| Fase 17 | TASK-23 |
| Fase 18 | TASK-24 |
| Fase 19 | TASK-25 |
| Fase 20 | TASK-26 |
| Fase 21 | TASK-27 |
| Fase 22 | TASK-28 |
| Fase 23 | TASK-29 |
| Fase 24 | TASK-30 |
| Fase 25 | TASK-32 |
| Fase 26 | TASK-31 |
| Fase 27 | TASK-33 |
| Fase 28 | TASK-34 |
| Fase 29 | TASK-35 |
| Fase 30 | TASK-36 |
| Fase 31 | TASK-37 |
| Fase 32 | TASK-38 |
| Fase 33 | TASK-39 |
| Fase 34 | TASK-40 |
| (no Roadmap phase) | TASK-41–47 (M1.5 and M2) |

## Authority and precedence

1. `NFFC_Development_Plan.md` v3.2 — scope, order, per-TASK acceptance criteria.
2. `NFFC_Claude_Master_Prompt.md` v2.1 — role, absolute rules, execution protocol, Git/PR policy, DoD.
3. `NFFC_Whitepaper.md` v1.1 — product intent and mechanics.
4. `NFFC_Roadmap.md` v1.1 — milestone framing.
5. This spec set — engineering interpretation of the above. Where this set and a governance document
   disagree, the governance document wins and the discrepancy is raised to the Project Lead, not
   silently resolved.
