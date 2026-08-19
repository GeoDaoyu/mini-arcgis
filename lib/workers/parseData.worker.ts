import { handleParseDataRequest } from "./parseDataHandler";
import type {
  ParseDataPayload,
  ParseTask,
  WorkerRequest,
  WorkerResponse,
} from "./types";

/**
 * Dedicated worker entry point.
 *
 * `self` is cast to a minimal interface instead of referencing the WebWorker
 * lib, so this file compiles cleanly alongside the DOM lib used by the rest
 * of the library.
 */
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};

ctx.onmessage = async (event) => {
  const { id, task, payload } = event.data;

  try {
    const result = await handleParseDataRequest(
      task as ParseTask,
      payload as ParseDataPayload,
    );
    ctx.postMessage({ id, ok: true, result });
  } catch (error) {
    ctx.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
