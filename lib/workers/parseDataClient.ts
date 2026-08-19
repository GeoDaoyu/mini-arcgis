import { RpcWorkerClient } from "./rpcClient";
import { handleParseDataRequest } from "./parseDataHandler";
import type {
  GraphicDescriptor,
  ParseDataPayload,
  ParseTask,
} from "./types";

let client: RpcWorkerClient | null = null;

/**
 * Lazily creates the shared parse worker.
 *
 * `new Worker(new URL("./parseData.worker.ts", import.meta.url))` is the
 * Vite idiom: Vite bundles the worker into its own chunk and rewrites the
 * URL at build time, in both app and library builds.
 */
function getClient(): RpcWorkerClient {
  if (!client) {
    client = new RpcWorkerClient(
      () =>
        new Worker(new URL("./parseData.worker.ts", import.meta.url), {
          type: "module",
        }),
    );
  }
  return client;
}

/**
 * Runs a parse-data task, offloading the heavy work — fetching, GeoJSON →
 * ArcGIS conversion, Web Mercator → lng/lat projection — to a shared Web
 * Worker so the main thread stays responsive with large datasets.
 *
 * Falls back to executing the same logic on the main thread when `Worker`
 * is unavailable (e.g. SSR, non-browser environments).
 */
export async function requestParseData(
  task: ParseTask,
  payload: ParseDataPayload,
): Promise<GraphicDescriptor[]> {
  if (typeof Worker === "undefined") {
    return handleParseDataRequest(task, payload);
  }
  return getClient().request<GraphicDescriptor[]>(task, payload);
}
