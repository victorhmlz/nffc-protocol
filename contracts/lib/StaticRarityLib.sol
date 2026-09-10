// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Static rarity (TASK-14) — an NFFC's *birth* rarity, from the structure of its
 * composition alone: fewer components and more weight concentration ⇒ rarer.
 * Pure, deterministic, and computable from on-chain data only — no price, no
 * oracle (`NFFC_Development_Plan.md` v3.2 TASK-14; `docs/static-rarity.md`).
 *
 * `NFFC.getStaticRarity` calls {score} over a token's immutable weights; the
 * off-chain mirror lives under `domain/rarity` and must stay bit-identical
 * (shared test vectors).
 */
library StaticRarityLib {
    uint256 internal constant WAD = 1e18; // fixed-point 1.0 — the score's scale
    uint256 internal constant MAX_COMPONENTS = 20;
    uint256 internal constant BPS_SQ_TOTAL = 1e8; // (10_000)^2 — Σwᵢ² when one component holds all weight

    /// Relative pull of each axis on the final score.
    uint256 internal constant CONC_WEIGHT = 3;
    uint256 internal constant COUNT_WEIGHT = 2;

    error EmptyComposition();

    /**
     * @param weightsBps component weights in basis points, in composition order.
     *        The caller (`NFFC.mint`) guarantees `1 ≤ n ≤ 20`, every `w > 0`, and
     *        `Σ w == 10_000` (invariants I1–I4).
     * @return a rarity score in `[0, WAD]`; higher = rarer.
     */
    function score(uint16[] memory weightsBps) internal pure returns (uint256) {
        uint256 n = weightsBps.length;
        if (n == 0) revert EmptyComposition();
        if (n == 1) return WAD; // one component: maximally concentrated and scarce

        // Herfindahl index of the weights (Σ wᵢ², bps²).
        uint256 hhi;
        for (uint256 i; i < n; ++i) {
            uint256 w = weightsBps[i];
            hhi += w * w;
        }

        // Concentration, normalised so an even split → 0 and one-holds-all → WAD.
        //   concNorm = (hhi·n − BPS_SQ_TOTAL) · WAD / (BPS_SQ_TOTAL · (n − 1))
        uint256 num = hhi * n;
        uint256 concNorm;
        if (num > BPS_SQ_TOTAL) {
            concNorm = ((num - BPS_SQ_TOTAL) * WAD) / (BPS_SQ_TOTAL * (n - 1));
            if (concNorm > WAD) concNorm = WAD;
        }

        // Scarcity in component count: 2 components → near WAD, 20 → 0.
        uint256 countNorm = ((MAX_COMPONENTS - n) * WAD) / (MAX_COMPONENTS - 1);

        return (concNorm * CONC_WEIGHT + countNorm * COUNT_WEIGHT) / (CONC_WEIGHT + COUNT_WEIGHT);
    }
}
