/**
 * The one interface every asset provider is integrated through. Robinhood
 * (TASK-06) and native crypto (TASK-07) implement it identically, with no
 * hierarchy between them (`docs/spec/05-adapter-architecture.md`).
 *
 * An adapter's job is to keep the registry's view of *its own* provider's
 * representations correct and to expose a price read for them. It never holds
 * user assets and never computes a price of its own invention.
 */
import type { UnixSeconds } from "@domain/shared/branded";
import type {
  ProviderId,
  Representation,
  RepresentationId,
} from "@domain/registry/types";
import type { NormalizedPrice } from "@domain/pricing/types";

/** One representation as reported by a provider's authoritative source. */
export interface ProviderRepresentationRecord {
  readonly representation: Omit<
    Representation,
    "createdAt" | "updatedAt" | "status"
  >;
  readonly active: boolean;
  readonly observedAt: UnixSeconds;
}

export interface ProviderSyncResult {
  readonly providerId: ProviderId;
  readonly upserted: readonly RepresentationId[];
  readonly deactivated: readonly RepresentationId[];
  readonly at: UnixSeconds;
}

export interface ProviderAdapter {
  readonly providerId: ProviderId;

  /**
   * Pull the provider's current official, verified representation list. The
   * sync worker (TASK-06/07) reconciles the result into the registry. Pure
   * read — no writes here.
   */
  fetchRepresentations(): Promise<readonly ProviderRepresentationRecord[]>;

  /** Normalized price for one of this provider's representations. */
  readPrice(representationId: RepresentationId): Promise<NormalizedPrice>;
}
