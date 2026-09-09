import type { UnixMillis } from "@domain/shared/branded";

/**
 * Time source. Injected rather than calling `Date.now()` directly so valuation,
 * staleness checks, and tests are deterministic.
 */
export interface Clock {
  nowMillis(): UnixMillis;
}
