/**
 * Where the indexer (TASK-24) writes — the mirror tables plus its own
 * resume cursor (`docs/spec/09-data-model.md`). `recordActivity`'s return
 * value is the indexer's single idempotency gate: a log already applied
 * (same `(txHash, logIndex)`) returns `false`, telling the orchestrator to
 * skip the accompanying `MirrorWrite` too — reprocessing a block is then a
 * no-op by construction, not by every individual upsert happening to be
 * idempotent on its own (TASK-24 acceptance).
 */
import type { ActivityEntry } from "@domain/nffc-detail/detail";
import type { MirrorWrite } from "@domain/indexer/plan";

export interface IndexerStore {
  /** `null` if this stream has never run. */
  getCursor(stream: string): Promise<number | null>;
  advanceCursor(stream: string, lastBlock: number, status: "OK" | "BEHIND" | "ERROR"): Promise<void>;
  /** Returns `true` if this was a new row (not seen before), `false` if
   *  `entry.id` (`${txHash}-${logIndex}`) was already recorded. */
  recordActivity(entry: ActivityEntry): Promise<boolean>;
  applyMirrorWrite(write: MirrorWrite): Promise<void>;
}
