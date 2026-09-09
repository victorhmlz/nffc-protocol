/**
 * In-memory lookup from `ProviderId` to its `ProviderAdapter`. Adapters are
 * registered at the composition root (an app route or a worker entry), never
 * inside the domain. This is the wiring point that keeps `domain/` from ever
 * naming Robinhood or crypto directly.
 *
 * Concrete adapters arrive in TASK-06 (`adapters/robinhood/`) and TASK-07
 * (`adapters/crypto/`).
 */
import type { ProviderId } from "@domain/registry/types";
import type { ProviderAdapter } from "@domain/ports";

export interface ProviderAdapterRegistry {
  register(adapter: ProviderAdapter): void;
  get(providerId: ProviderId): ProviderAdapter | undefined;
  list(): readonly ProviderAdapter[];
}

export function createProviderAdapterRegistry(): ProviderAdapterRegistry {
  const byId = new Map<ProviderId, ProviderAdapter>();
  return {
    register(adapter) {
      byId.set(adapter.providerId, adapter);
    },
    get(providerId) {
      return byId.get(providerId);
    },
    list() {
      return [...byId.values()];
    },
  };
}
