import { buffer } from "@turf/turf";
import { arcgisToGeoJSON, geojsonToArcGIS } from "@terraformer/arcgis";
import Point from "../Point";
import Polyline from "../Polyline";
import Polygon from "../Polygon";

export type GeometryUnion = Point | Polyline | Polygon;

export type LengthUnit =
  | "meters"
  | "feet"
  | "kilometers"
  | "miles"
  | "nauticalmiles"
  | "yards";

export interface ExecuteOptions {
  unit?: LengthUnit | undefined;
}

export interface ExecuteManyOptions extends ExecuteOptions {
  maxDeviation?: number | undefined;
  maxVerticesInFullCircle?: number | undefined;
  union?: boolean | undefined;
}

export const supportsCurves = true;

/**
 * Creates a buffer around the input geometry.
 */
export function execute(
  geometry: GeometryUnion,
  distance: number,
  options?: ExecuteOptions,
): Polygon | null | undefined {
  const geojson =
    geometry.type === "point"
      ? arcgisToGeoJSON({
          x: (geometry as Point).longitude,
          y: (geometry as Point).latitude,
        })
      : arcgisToGeoJSON(geometry as any);

  const unit = options?.unit ?? "meters";

  const result = buffer(geojson, distance, { units: unit });

  if (!result || !result.geometry) return null;

  if (
    result.geometry.type !== "Polygon" &&
    result.geometry.type !== "MultiPolygon"
  ) {
    return null;
  }

  const resultGeom =
    result.geometry.type === "MultiPolygon"
      ? { type: "Polygon" as const, coordinates: result.geometry.coordinates[0] }
      : result.geometry;

  const arcgisResult = geojsonToArcGIS(resultGeom);

  if (!arcgisResult || !arcgisResult.rings) return null;

  return new Polygon({ rings: arcgisResult.rings as number[][][] });
}

/**
 * Creates a buffer around the input geometries.
 */
export function executeMany(
  geometries: GeometryUnion[],
  distances: number[],
  options?: ExecuteManyOptions,
): Polygon[] {
  const results: Polygon[] = [];

  for (let i = 0; i < geometries.length; i++) {
    const dist =
      i < distances.length
        ? distances[i]
        : distances[distances.length - 1];
    const buffered = execute(geometries[i], dist, options);
    if (buffered) {
      results.push(buffered);
    }
  }

  return results;
}
