/**
 * Minimal harness for a background worker. Workers are plain Node processes run
 * outside the Next.js request cycle (`docs/spec/03-architecture.md` §4) — never
 * a long-lived Route Handler.
 *
 * The concrete TS runner (`tsx`, Node native type-stripping, or a `tsc` build
 * step) and a `pnpm worker` script are chosen in TASK-06, alongside the local
 * Node baseline — see `docs/reports/TASK-02-REPORT.md` KNOWN ISSUES. Concrete
 * workers (representation sync, indexer, NAV materialization, art rendering)
 * arrive in TASK-06 / TASK-07 / TASK-24 / TASK-12.
 */
export interface Worker {
  readonly name: string;
  /**
   * Run until the work is done or `signal` aborts. Implementations must return
   * promptly once `signal.aborted` is true (finish the in-flight unit, persist
   * the cursor, resolve).
   */
  run(signal: AbortSignal): Promise<void>;
}

export async function runWorker(worker: Worker): Promise<void> {
  const controller = new AbortController();
  const stop = (): void => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    await worker.run(controller.signal);
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}
