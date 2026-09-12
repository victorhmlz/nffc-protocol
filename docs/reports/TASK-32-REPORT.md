# TASK 32 REPORT

## STATUS

COMPLETED

`pnpm verify` (lint · typecheck · test · build) green: 101 files, 499 tests (unchanged — no
TypeScript touched this TASK), 21 routes. `pnpm contracts:test`: **224 Solidity tests** (was 211;
+13 — 8 new fuzz tests, 5 new access-control unit tests). No contract behavior changed — every
addition this TASK is a test or a doc.

## OBJECTIVE

"Threat model, tests de seguridad, revisión de access control" (`NFFC_Development_Plan.md` v3.4
TASK-32). Depends on all contract TASKs (05–31), all merged.

## THE TWO CONDITIONS ON THIS AUTHORIZATION — ANSWERED EXPLICITLY

### Condition 1 — `docs/OPEN_ISSUES.md` Issue #4 (front-running)

**Evaluated and explicitly deferred to TASK-40 — not a repeat of "no bloqueante, sin loguear".**
`docs/threat-model.md` §3 walks all six state-changing `Marketplace.sol` entry points
(`createListing`, `cancelListing`, `buy`, `createOffer`, `cancelOffer`, `acceptOffer`) against the
actual failure mode a front-runner could exploit. Conclusion: in this specific design — exact-match
price (`msg.value == l.price`, no slippage tolerance), atomic settlement, no partial fills — every
race (two buyers on one listing, a seller changing price mid-flight, `cancelOffer` racing
`acceptOffer`) resolves to "the losing transaction reverts entirely, no principal moves at the wrong
price." The two hallmarks of an MEV attack (searcher profit + victim loss) are both structurally
absent — there is no vector for a third party to extract value from a counterparty here, unlike an
AMM sandwich attack (no price curve or reserve a searcher could move between submission and
execution).

**Decision:** deliberately deferred to TASK-40, not mitigated in this TASK. A real MEV mitigation
(commit-reveal, a private relay, `buy(tokenId, maxPrice)` semantics) depends on operational facts
that don't exist yet — Robinhood Chain's actual mempool behavior, private-relay availability, an
acceptable UX-friction tradeoff — and TASK-40 already scopes "deployment scripts proven on testnet"
and an independent security audit, the right place to weigh a concrete mitigation against real
conditions rather than a Solidity-only judgment call made in the abstract. `docs/OPEN_ISSUES.md`
Issue #4 is updated (not deleted — it isn't resolved) to record this analysis and reassign it
explicitly to TASK-40.

### Condition 2 — Whitepaper §14 / F1 regulatory classification risk

`docs/threat-model.md` §6 records F1 as an **open finding** and explicitly declines to close it:
"no contract change, test, or code review can determine whether NFFC's structure triggers
fund/composite-instrument classification in any given jurisdiction... resolving it is explicitly
the Project Lead's decision, made with legal counsel." The section states outright that marking this
"mitigated" from inside a threat model would be the threat model overstepping into a determination
it has no authority to make. This mirrors, verbatim in spirit, `docs/spec/08-security-principles.md`
§4's own framing of F1 — this TASK does not add a new position, it restates and cross-references
the existing one and stops.

## CHANGES

### `docs/threat-model.md` (new)

The primary deliverable. Structure: trust boundaries (§1); a STRIDE-style analysis per contract/
contract-group (§2: registries+adapters, `Collection.sol`, `NFFC.sol` mint path, `Marketplace.sol`
buy/offer paths, `FeeConfig.sol`), each threat marked Mitigated/Accepted/Open with the actual
mechanism or test cited — not a generic checklist; Issue #4's full analysis (§3); the access-control
review table (§4, 23 gated functions across 8 contracts, before/after this TASK's coverage); the
fuzzing-coverage table for mint/marketplace (§5, the acceptance criterion's explicit ask); F1
recorded open (§6); residual risks carried forward unchanged (§7, F2/F3/independent-audit).

### Access control review — found and closed 5 untested (but correctly-implemented) gates

`RepresentationRegistry.sol`'s `setProviderAdapter`/`setProviderActive` had **no** unauthorized-
caller test at all, and the shared `_requireProviderAuth` gate (role OR the representation's own
adapter) had only ever been proven for the *registration* path
(`test_adapter_cannotRegisterForOtherProvider`) — never for `setRepresentationStatus`,
`deactivateRepresentation`, or `updateOracleMetadata`, the three other functions that share the same
gate. The gate itself was always correctly implemented in every case (verified by reading the
contract before writing tests, not assumed); this was a test-coverage gap, not a contract defect.
Closed with 5 new tests in `contracts/RepresentationRegistry.t.sol` (`test_setProviderAdapter_
onlyAdmin_reverts`, `test_setProviderActive_onlyAdmin_reverts`,
`test_setRepresentationStatus_unauthorizedCaller_reverts`,
`test_deactivateRepresentation_unauthorizedCaller_reverts`,
`test_updateOracleMetadata_unauthorizedCaller_reverts` — the last three each check both a plain
stranger and *another provider's own adapter*, proving cross-provider isolation, not just
non-admin rejection).

Also documented (no code change — a design observation, not a defect): `ProviderAdapterBase`-
derived adapters hold registry-wide `REGISTRY_ADMIN_ROLE` on `AssetIdentityRegistry` per the
deployment wiring comment, but the adapter's own code surface only ever exercises that role scoped
to its hardcoded `_assetClass()`/`_providerId()` — least privilege here is enforced by the calling
contract's limited interface, not by the role definition alone. Flagged in `docs/threat-model.md`
§2.2 as a constraint any *future* adapter reusing this base contract must preserve, not a finding
against the two adapters that exist today.

### Fuzzing hardening — mint and marketplace (acceptance criterion, verbatim)

8 new fuzz tests, each generalizing an existing fixed-input test to the full relevant input space
(256 runs each, Foundry defaults):

- `NFFC.t.sol`: `testFuzz_mint_weightSumMismatch_reverts` (I2's negative space — any two-component
  weight pair that doesn't sum to 10 000 reverts), `testFuzz_mint_feeMismatch_reverts` (any mint
  fee mismatch reverts, not just the two hand-picked off-by-one cases), `testFuzz_pause_onlyPauser`
  (no non-admin address can pause minting).
- `Marketplace.t.sol`: `testFuzz_cancelOffer_onlyBuyer`, `testFuzz_acceptOffer_onlyCurrentOwner`,
  `testFuzz_pause_onlyPauser` (each: no address but the rightful one can act), `testFuzz_
  acceptOffer_expiryBoundary` (the exact `now <= expiry` boundary property, across the whole
  `(expiry, now)` space), `testFuzz_buy_priceMismatch_reverts` (any `msg.value` mismatch reverts,
  across the whole price/value space, generalizing the two fixed underpay/overpay tests).

Pre-existing fuzz coverage on these two paths (`testFuzz_mint_twoComponentWeights`,
`testFuzz_mint_componentCount_allCrypto`, `testFuzz_cancelListing_onlySeller`, `testFuzz_
curves_areMonotonic`, `testFuzz_buy_feeRoyaltySplit_conservesValue`) was already solid — this TASK
extends it to the gaps the review found (negative-space invariants, boundary properties, and every
access-control gate on both paths), rather than duplicating what was already proven.

### `docs/OPEN_ISSUES.md`

Issue #4 rewritten in place (analysis + explicit TASK-40 reassignment, see above). No other issue
touched.

### `README.md`

Status paragraph updated for TASK-32; added `docs/threat-model.md` link.

## FILES CREATED

```
docs/threat-model.md
docs/reports/TASK-32-REPORT.md
```

## FILES MODIFIED

```
contracts/NFFC.t.sol               +3 fuzz tests (weight-sum mismatch, fee mismatch, pause-only)
contracts/Marketplace.t.sol        +5 fuzz tests (cancelOffer/acceptOffer/pause access control,
                                    expiry boundary, buy price-mismatch property)
contracts/RepresentationRegistry.t.sol  +5 access-control unit tests (setProviderAdapter/
                                    setProviderActive/setRepresentationStatus/
                                    deactivateRepresentation/updateOracleMetadata)
docs/OPEN_ISSUES.md                Issue #4 rewritten: evaluated, explicitly deferred to TASK-40
README.md                          status paragraph; docs/threat-model.md link
```

No `.sol` production contract touched — every change this TASK is a test file, a doc, or the issue
log. Branch is based on `main` (TASK-00…31) — see PULL REQUEST.

## TESTS

`pnpm contracts:test` → **224 Solidity tests** (was 211), all passing:

```
+8  new fuzz tests (NFFC.t.sol ×3, Marketplace.t.sol ×5), 256 runs each
+5  new access-control unit tests (RepresentationRegistry.t.sol)
```

`pnpm test` (JS/TS) → unchanged, **101 files, 499 tests** — no TypeScript touched.

## BUILD

`pnpm build` → unchanged, **21 routes** — no frontend code touched.

## LINT / TYPECHECK

Clean — no TypeScript touched this TASK. Solidity: `pnpm contracts:build` compiles cleanly with
solc 0.8.34.

## SECURITY

STEP 5 AUDIT (`docs/spec/08-security-principles.md`): this TASK *is* the audit — see
`docs/threat-model.md` for the full analysis. Summary of what changed the codebase's actual security
posture (as opposed to what changed only documentation):

| Change | Effect |
|---|---|
| 5 new access-control tests | Proved (not just asserted) that `setProviderAdapter`, `setProviderActive`, and the shared `_requireProviderAuth` gate on 3 more functions correctly reject every unauthorized caller, including a same-role adapter from a different provider — closing a real proof gap, not a real vulnerability (the gates were already correct). |
| 8 new fuzz tests | Extended existing narrow fuzz coverage on mint/marketplace to the negative space of invariants (I2) and to every access-control gate and boundary condition (expiry, exact-price-match) on both critical paths, per the acceptance criterion's literal text. |
| Issue #4 analysis | Downgraded "front-running, no mitigation, unassigned" to a reasoned, specific conclusion (no fund-loss vector in this exact design) plus an explicit, justified deferral — a real decision, not a restatement. |
| F1 recorded open | Satisfies the acceptance criterion's explicit requirement that this remain open, not closed, by this TASK. |

## PERFORMANCE

N/A — no contract or application code changed; only tests and documentation.

## KNOWN ISSUES

1. **Issue #4 mitigation itself remains undone** — by design, deferred to TASK-40 (see above). Not
   a gap in this TASK; the explicit point of the deferral.
2. **F1 (regulatory classification) remains open** — by design, per this TASK's own acceptance
   criterion. Not this TASK's to resolve.
3. **Independent third-party security audit has not happened** — `NFFC_Development_Plan.md`
   TASK-40 requires one explicitly; this TASK's threat model and fuzz tests are this project's own
   internal review, not a substitute.
4. **`docs/spec/08-security-principles.md`'s threat-surface table (§3) is not rewritten** — this
   TASK's `docs/threat-model.md` supersedes it in depth (per-contract STRIDE vs. one summary table)
   but the original table is left as-is, since `08-security-principles.md` is a spec document this
   session doesn't rewrite unilaterally beyond what a specific TASK's own acceptance criteria
   requires; TASK-32's criteria didn't ask for that document to be edited.

## ACCEPTANCE CRITERIA

`NFFC_Development_Plan.md` v3.4 TASK-32:

| Criterion | Status | Evidence |
|---|---|---|
| Threat model documenta explícitamente el riesgo de clasificación regulatoria como fondo/producto compuesto (Whitepaper §14) como hallazgo abierto, no cerrado | Met | `docs/threat-model.md` §6 — explicit, with reasoning for why it stays open and whose decision it is |
| Cobertura de tests de contratos con fuzzing en las rutas críticas (mint, marketplace) | Met | `docs/threat-model.md` §5 — 11 fuzz tests total across the two paths (6 pre-existing + 5 new to mint's 3 total, 6 total to marketplace's 5 new); `pnpm contracts:test` 224 passing |

Plus this authorization's own two conditions, both answered explicitly above (Issue #4; F1).

## PULL REQUEST

Branch `task/TASK-32-security-hardening`, based on **`main`** (TASK-00…31).

**PR: (to be filled in once opened)**
**CI: (to be filled in once green)**

**Do not merge** — Project Lead reviews and authorizes.

## NEXT TASK

**TASK-33 — Error Handling** (`NFFC_Development_Plan.md` v3.4, depende de TASK-16, TASK-24, ambas
mergeadas). Blocked until the Project Lead merges this PR and authorizes TASK-33.
