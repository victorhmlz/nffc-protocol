# 08 — Security Principles

**Source intent:** `NFFC_Whitepaper.md` v1.1 §10, §14; `NFFC_Roadmap.md` v1.1 Fase 25, Fase 34;
`NFFC_Development_Plan.md` v3.2 TASK-32, TASK-40; `NFFC_Claude_Master_Prompt.md` v2.1 Rule 5.

This document states the posture. The formal threat model, fuzzing, and independent audit are
TASK-32 and TASK-40; this seeds them and binds every earlier TASK.

---

## 1. Contract security rules (non-negotiable)

| # | Rule |
|---|---|
| S1 | Use **OpenZeppelin** for ERC-721, `AccessControl`, `Pausable`, `ReentrancyGuard`. Do not reimplement these. |
| S2 | **No custom cryptography.** Use audited primitives only. |
| S3 | **Never `tx.origin`** for authorization. Use `msg.sender` + roles. |
| S4 | **Checks-Effects-Interactions** on every path that moves value or transfers a token. |
| S5 | **`ReentrancyGuard`** on every external value-moving function (`buy`, `acceptOffer`, fee payouts). Reentrancy resistance is proven with dedicated tests (`NFFC_Development_Plan.md` TASK-19 acceptance). |
| S6 | **Custom errors**, complete **events** for every state change (registry, mint, listing, sale, offer, fee change). |
| S7 | **Least privilege**: scoped roles (`REGISTRY_ADMIN_ROLE`, `ADAPTER_ROLE` per provider, `FEE_ADMIN_ROLE`, `PAUSER_ROLE`). An adapter can touch only its own provider's representations. |
| S8 | **Multisig** holds `DEFAULT_ADMIN_ROLE` and every sensitive admin role in production (`NFFC_Development_Plan.md` TASK-31 acceptance; TASK-40 gate). |
| S9 | **Allowlist only**: no code path turns a user-supplied address into a supported asset (`NFFC_Claude_Master_Prompt.md` v2.1 Rule 2). |
| S10 | **Immutable composition**: no function, under any role, mutates an NFFC's composition after mint (invariant I7). |
| S11 | **Pausable** guarded surfaces (marketplace, mint) with a documented pause/unpause runbook (TASK-40). |
| S12 | **No custody**: contracts never hold user Stock Tokens or crypto; NFFC transfers follow ERC-721 safe-transfer semantics (`NFFC_Claude_Master_Prompt.md` v2.1 Rule 3). |
| S13 | **On-chain is source of truth**: ownership is read from chain; the database is never the authority for ownership (`NFFC_Claude_Master_Prompt.md` v2.1 Rule 4). |
| S14 | Pin Solidity version; no floating pragma in deployed contracts; deps pinned. |

## 2. Application / off-chain security rules

| # | Rule |
|---|---|
| A1 | Secrets never committed. `.env.example` documents variables; real values via environment (`NFFC_Development_Plan.md` TASK-04 acceptance). |
| A2 | All external input (API routes, wizard, admin) validated server-side with explicit types — no trusting the client. |
| A3 | Rate limiting on write-ish API routes and on expensive reads (`NFFC_Roadmap.md` Fase 25). |
| A4 | The indexer is **idempotent** and recovers after downtime without losing or duplicating events (`NFFC_Development_Plan.md` TASK-24 acceptance). |
| A5 | Reads that inform a user decision (Reference NAV, fees) always carry provenance (source + timestamp); stale oracle data is flagged, never silently served (`NFFC_Development_Plan.md` TASK-15, TASK-22). |
| A6 | No `any` without a justifying comment; `strict` TypeScript from the first commit (`NFFC_Development_Plan.md` TASK-01). |
| A7 | Wallet integration is self-custody only; the backend never stores private keys and can never move a user's NFFC (`NFFC_Development_Plan.md` TASK-16 acceptance). |
| A8 | Generative art and the mint-condition trait are deterministic and reproducible from on-chain data — auditable, not a black box (`NFFC_Development_Plan.md` TASK-12, TASK-13). |

## 3. Threat surface (to be expanded into the TASK-32 threat model)

| Area | Representative threats |
|---|---|
| Registry | Unauthorized representation registration; adapter escalating outside its provider scope; registering an unverified or malicious token address |
| Mint | Composition-invariant bypass (I1–I8); fee underpayment; segment/rarity manipulation via crafted params; representation `INACTIVE` at mint but accepted |
| Marketplace | Reentrancy on `buy` / `acceptOffer`; non-owner cancelling a listing; accepting an expired offer; fee/royalty math over/underflow or misrouting; front-running a listing price change |
| Oracle | Stale or manipulated Chainlink feed; feed retirement; heartbeat misconfiguration; NAV computed on degraded data |
| Adapters / sync | Malicious or compromised provider data source; silent mass-deactivation; duplicate rows corrupting valuation |
| Indexer | Reorg handling; missed events; duplicate processing; DB treated as ownership authority |
| Admin | Single-key admin action (must be multisig); fee param set beyond hard cap; unpause without runbook |
| Frontend | Showing `SUCCESS` before confirmation; hardcoded fees drifting from chain; social-preview spoofing; wallet phishing patterns |
| Regulatory (see §4) | Product presented in a way that increases classification risk; geographic restriction not surfaced |

## 4. Open regulatory / geographic findings — carried, not closed

Per `NFFC_Claude_Master_Prompt.md` v2.1 STEP 5 and `NFFC_Development_Plan.md` TASK-32/TASK-40, these
are **open findings**. They are not resolved by engineering and must remain visible through mainnet
readiness:

- **F1 — Composite-instrument classification risk.** An NFFC bundling weighted asset representations
  may, depending on jurisdiction, marketing, custody, and economic rights, be treated as a fund or
  composite/structured product (`NFFC_Whitepaper.md` §14). Status: **open**; independent legal review
  required before large-scale commercial use and before any V2 (`NFFC_Development_Plan.md` TASK-40).
- **F2 — Geographic exclusion.** Robinhood Stock Tokens are unavailable to US persons and restricted
  in Canada, the UK, Switzerland, and other jurisdictions. Any NFFC containing ≥1 Stock Token
  inherits that restriction; 100%-crypto compositions do not inherit this specific restriction
  (`NFFC_Whitepaper.md` §14). Status: **open**; must be surfaced in UX (`07-ux-map.md` §6) and
  covered by TASK-40 legal review.
- **F3 — "Reference NAV" / Market-State framing.** Valuation and any market-state view must not read
  as backing or as investment-return promotion. Mitigations: labeling rules (`07-ux-map.md` §6);
  Market-State copy is legal-reviewed before publishing (V1.5, `NFFC_Development_Plan.md` TASK-42).
  Status: **mitigated in design, open for legal sign-off**.

## 5. Verification expectations (later TASKS)

- **TASK-32**: written threat model (with F1 explicitly recorded as open), access-control review,
  contract test coverage **with fuzzing on the critical paths (mint, marketplace)**.
- **TASK-40 (mainnet gate)**: independent security audit complete; multisig on every admin function;
  deployment + verification scripts proven on testnet; monitoring + backups live; emergency
  procedures documented; legal review covering F1 and F2.
- Every earlier contract/composition/price TASK runs STEP 5 AUDIT against this list and records any
  applicable open finding rather than resolving it unilaterally.
