import "server-only";

/**
 * `NavStore` (`domain/ports/nav-store.ts`) over the `nav_point` table
 * (`db/migrations/0002_price_nav.sql`, `docs/spec/09-data-model.md`). Thin
 * glue over `infra/db`'s pool — untested directly, like `infra/db/pool.ts`
 * itself (`docs/conventions.md` §4). `record` persists the full `basis`
 * (`docs/spec/09-data-model.md`: "the price_point ids used, for
 * reproducibility"), even though `getHistory`'s `NavPoint` projection drops
 * it — the row itself stays fully reproducible even when a chart only needs
 * the lean series.
 */
import type { TokenId } from "@domain/nffc/composition";
import type { UnixSeconds } from "@domain/shared/branded";
import type { NavPoint } from "@domain/valuation/types";
import type { NavStore } from "@domain/ports/nav-store";
import { query } from "@infra/db/pool";

interface NavPointRow {
  readonly token_id: string;
  readonly reference_nav: string;
  readonly computed_at: Date;
  readonly is_degraded: boolean;
}

function rowToNavPoint(row: NavPointRow): NavPoint {
  return {
    tokenId: BigInt(row.token_id) as TokenId,
    value: Number(row.reference_nav),
    at: Math.floor(row.computed_at.getTime() / 1000) as UnixSeconds,
    degraded: row.is_degraded,
  };
}

export function createPostgresNavStore(): NavStore {
  return {
    async record(nav) {
      await query(
        `INSERT INTO nav_point (token_id, reference_nav, computed_at, basis, is_degraded)
         VALUES ($1, $2, to_timestamp($3), $4::jsonb, $5)
         ON CONFLICT (token_id, computed_at) DO NOTHING`,
        [nav.tokenId.toString(), nav.value, nav.computedAt, JSON.stringify(nav.basis), nav.degraded],
      );
    },

    async getHistory(tokenId, sinceUnixSeconds) {
      const result = await query<NavPointRow>(
        `SELECT token_id, reference_nav, computed_at, is_degraded
         FROM nav_point
         WHERE token_id = $1 AND computed_at >= to_timestamp($2)
         ORDER BY computed_at ASC`,
        [tokenId.toString(), sinceUnixSeconds],
      );
      return result.rows.map(rowToNavPoint);
    },
  };
}
