/**
 * Example worker — copy this shape for real workers. Does nothing but prove the
 * harness compiles and runs as a plain Node process (no Next.js).
 */
import { runWorker, type Worker } from "@workers/runtime";

const exampleWorker: Worker = {
  name: "example",
  async run(signal) {
    if (signal.aborted) return;
    // Real workers loop here: read a cursor, do one unit, persist, repeat.
  },
};

await runWorker(exampleWorker);
