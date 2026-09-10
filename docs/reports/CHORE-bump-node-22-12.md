# CHORE — bump local Node to ≥ 22.13, drop the vite\@6 / jsdom\@25 workaround

Standalone maintenance fix (not part of any TASK). Resolves the "local Node blocks local
Hardhat" item carried in the reports since TASK-03.

## STATUS

DONE — `pnpm verify` (lint · typecheck · test · build) **and** `pnpm contracts:build` +
`pnpm contracts:test` all green **locally** on Node 22.13.0. Hardhat 3 runs locally for the
first time in this repo.

## NODE — BEFORE / AFTER

| | Version | How |
|---|---|---|
| Before | **v22.8.0** | nvm-windows; predates stable `require(esm)` (landed in 22.12.0) |
| After | **v22.13.0** | installed by the Project Lead outside this session (nvm-windows in an elevated terminal); Hardhat 3's real floor is 22.13 |

nvm-windows could not install or switch Node non-interactively from the automation shell
(`nvm install` / `nvm use` hang — the `use` step needs UAC to rewrite the
`C:\Program Files\nodejs` junction), so per the STEP 2 instruction the install was handed
back to the Project Lead:

```
# run in a terminal opened "as administrator"
nvm install 22.13.0
nvm use 22.13.0
```

## COMMANDS RUN (this session, after Node 22.13.0 was active)

```
corepack enable                 # re-shim pnpm 12.3.4 on the new Node
pnpm install                    # re-resolve without the overrides / old pins
pnpm run lint                   # ok
pnpm run typecheck              # ok
pnpm run test                   # 17 files, 56 tests — pass
pnpm run build                  # 5 routes — pass
pnpm verify                     # combined gate — pass
pnpm run contracts:build        # hardhat compile — 16 Solidity files, solc 0.8.34
pnpm run contracts:test         # 61 Solidity tests — pass
```

## CHANGES

| File | Change |
|---|---|
| `pnpm-workspace.yaml` | **Removed** the `overrides:` block (`vite: 6.4.3`, `jsdom: 25.0.1`) and its explanatory comment. `allowBuilds` and `minimumReleaseAgeExclude` (`zod@4.6.0`) are untouched. |
| `package.json` | `devDependencies`: `jsdom` `^25.0.1 → ^30.0.1`, `vite` `^6.4.3 → ^7.3.6` — the caret ranges were a second layer of the same old-Node pin; now at current. `vite` is not imported anywhere in the repo (grep-verified); it is a visible pin for the version Vitest 3.2.7 resolves (`^5 \|\| ^6 \|\| ^7` — not 8). |
| `.nvmrc` | `22 → 22.13.0` — pins the floor so it can't regress; CI's `actions/setup-node@v5` reads this file and now installs exactly 22.13.0. |
| `package.json` `engines.node` | **Unchanged** — already `>=22.13.0` (set in TASK-05), which enforces the requested `>=22.12` a fortiori and matches Hardhat 3's real floor. |
| `pnpm-lock.yaml` | Re-resolved: `overrides` section gone; `jsdom 25.0.1 → 30.0.1`, `vite 6.4.3 → 7.3.6`; net −32 transitive packages. `pnpm` reports the lockfile still passes the supply-chain (minimumReleaseAge) policy. |

## CI

`.github/workflows/ci.yml` — both jobs (`verify`, `contracts`) already use
`actions/setup-node@v5` with `node-version-file: .nvmrc`. No YAML edit needed; pinning
`.nvmrc` to `22.13.0` makes the CI Node deterministic and ≥ 22.12. CI previously resolved
`.nvmrc: 22` to a compliant 22.x already, so contracts were always CI-green — this change
only adds local parity.

## AUDIT (STEP 5)

- **No test behaviour changed from the bump.** Vitest: **17 files / 56 tests**, identical to
  the last green run (TASK-08). Solidity: **61 tests**, identical to the last green CI run
  (TASK-08, run `34468115754`). Same 5 build routes.
- **Nothing else depended on the old pins.** `vite` appears only in `package.json` (no
  imports). `jsdom` is used only as the Vitest `environment` — all 17 jsdom-environment test
  files pass on jsdom 30. The `overrides` block scoped only the `vite` / `jsdom` trees.
- No stale references to Node 22.8 / `6.4.3` / `jsdom 25` remain in tracked files outside the
  lockfile and the historical TASK reports (left as point-in-time records).

## PULL REQUEST

Branch `chore/bump-node-22-12`, based on **`task/TASK-08-composition-segmentation`** (the tip
of the unmerged TASK-00…08 stack — `pnpm-workspace.yaml` does not exist on `main` yet, so the
change is only coherent on top of the stack). It sits as the next link after TASK-08 and
**must merge before TASK-09 starts**.

**PR: https://github.com/victorhmlz/nffc-protocol/pull/10** — base `task/TASK-08-composition-segmentation`.

**Do not merge** — Project Lead reviews and authorizes. TASK-09 stays blocked until this is
merged.
