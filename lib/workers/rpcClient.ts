import type { WorkerRequest, WorkerResponse } from "./types";

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Minimal promise-based RPC wrapper around a single Worker.
 *
 * Each `request()` is assigned an id; the matching promise is resolved or
 * rejected when the worker posts a response with that id. Multiple callers
 * can share one worker because responses are correlated by id.
 */
export class RpcWorkerClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();

  constructor(private createWorker: () => Worker) {}

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = this.createWorker();

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        if (message.ok) {
          entry.resolve(message.result);
        } else {
          entry.reject(new Error(message.error));
        }
      };

      this.worker.onerror = (event) => {
        const error = new Error(
          event.message || "Unknown worker error",
        );
        for (const entry of this.pending.values()) {
          entry.reject(error);
        }
        this.pending.clear();
      };
    }
    return this.worker;
  }

  request<T = unknown>(task: string, payload: unknown): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject: reject as (error: Error) => void,
      });
      this.getWorker().postMessage({
        id,
        task,
        payload,
      } satisfies WorkerRequest);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
