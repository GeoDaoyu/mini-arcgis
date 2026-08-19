/**
 * Shared types for the Web Worker RPC protocol.
 *
 * These types are used on both the main thread and inside the worker, so
 * every value crossing the boundary must be structured-clone-safe (plain
 * objects/arrays/primitives only — no class instances, no functions).
 */

export type ParseTask =
  | "load-geojson"
  | "load-features"
  | "parse-geojson"
  | "parse-features";

export interface LoadGeoJSONPayload {
  url: string;
}

export interface LoadFeaturesPayload {
  url: string;
}

export interface ParseGeoJSONPayload {
  geojson: any;
}

export interface ParseFeaturesPayload {
  data: any;
}

export type ParseDataPayload =
  | LoadGeoJSONPayload
  | LoadFeaturesPayload
  | ParseGeoJSONPayload
  | ParseFeaturesPayload;

export interface WorkerRequest<T = unknown> {
  id: number;
  task: string;
  payload: T;
}

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

/** Plain geometry produced by the worker, ready to be rehydrated on the main thread. */
export type GeometryDescriptor =
  | { type: "point"; longitude: number; latitude: number }
  | { type: "polyline"; paths: number[][][] }
  | { type: "polygon"; rings: number[][][] };

/** Plain graphic produced by the worker, ready to be rehydrated on the main thread. */
export interface GraphicDescriptor {
  geometry: GeometryDescriptor;
  attributes: Record<string, any>;
}
