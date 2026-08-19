import { geojsonToArcGIS } from "@terraformer/arcgis";
import { xyToLngLat } from "@/geometry/support/webMercatorUtils";
import type {
  GeometryDescriptor,
  GraphicDescriptor,
  LoadFeaturesPayload,
  LoadGeoJSONPayload,
  ParseDataPayload,
  ParseFeaturesPayload,
  ParseGeoJSONPayload,
  ParseTask,
} from "./types";

export type { ParseDataPayload } from "./types";

/**
 * Entry point for parse-data tasks.
 *
 * Runs inside the Web Worker, but it is a pure function of its arguments and
 * imports nothing thread-specific, so the main thread can also call it
 * directly as a fallback when `Worker` is unavailable (e.g. SSR).
 */
export async function handleParseDataRequest(
  task: ParseTask,
  payload: ParseDataPayload,
): Promise<GraphicDescriptor[]> {
  switch (task) {
    case "load-geojson": {
      const { url } = payload as LoadGeoJSONPayload;
      const response = await fetch(url);
      const geojson = await response.json();
      return parseGeoJSON(geojson);
    }
    case "load-features": {
      const { url } = payload as LoadFeaturesPayload;
      const response = await fetch(url);
      const data = await response.json();
      return parseArcGISFeatures(data);
    }
    case "parse-geojson":
      return parseGeoJSON((payload as ParseGeoJSONPayload).geojson);
    case "parse-features":
      return parseArcGISFeatures((payload as ParseFeaturesPayload).data);
    default:
      throw new Error(`Unknown parse task: ${task}`);
  }
}

/**
 * Converts a GeoJSON document into structured-clone-safe graphic
 * descriptors. The GeoJSON → ArcGIS geometry conversion is the heavy part
 * and is what we offload to the worker.
 */
export function parseGeoJSON(geojson: any): GraphicDescriptor[] {
  const features =
    geojson.type === "FeatureCollection" ? geojson.features : [geojson];

  return features.map((feature: any) => {
    const arcgisGeometry = geojsonToArcGIS(feature.geometry);
    return {
      geometry: arcgisToGeometryDescriptor(arcgisGeometry),
      attributes: feature.properties || {},
    };
  });
}

/**
 * Converts an ArcGIS REST feature response into graphic descriptors,
 * projecting Web Mercator (EPSG:3857 / 102100) coordinates to lng/lat.
 */
export function parseArcGISFeatures(data: any): GraphicDescriptor[] {
  const { features, geometryType, spatialReference } = data;

  if (!features || !Array.isArray(features)) {
    return [];
  }

  const isWebMercator =
    spatialReference?.wkid === 102100 || spatialReference?.latestWkid === 3857;

  return features.map((feature: any) => ({
    geometry: arcgisFeatureToGeometryDescriptor(
      feature.geometry,
      geometryType,
      isWebMercator,
    ),
    attributes: feature.attributes || {},
  }));
}

function arcgisToGeometryDescriptor(
  arcgisGeometry: any,
): GeometryDescriptor {
  if (arcgisGeometry.x !== undefined && arcgisGeometry.y !== undefined) {
    return {
      type: "point",
      longitude: arcgisGeometry.x,
      latitude: arcgisGeometry.y,
    };
  }

  if (arcgisGeometry.paths) {
    return { type: "polyline", paths: arcgisGeometry.paths };
  }

  if (arcgisGeometry.rings) {
    return { type: "polygon", rings: arcgisGeometry.rings };
  }

  throw new Error("Unsupported geometry type");
}

function arcgisFeatureToGeometryDescriptor(
  arcgisGeometry: any,
  geometryType: string,
  isWebMercator: boolean,
): GeometryDescriptor {
  if (
    geometryType === "esriGeometryPoint" ||
    arcgisGeometry.x !== undefined
  ) {
    if (isWebMercator) {
      const [longitude, latitude] = xyToLngLat(
        arcgisGeometry.x,
        arcgisGeometry.y,
      );
      return { type: "point", longitude, latitude };
    }
    return {
      type: "point",
      longitude: arcgisGeometry.x,
      latitude: arcgisGeometry.y,
    };
  }

  if (geometryType === "esriGeometryPolyline" || arcgisGeometry.paths) {
    return {
      type: "polyline",
      paths: projectCoordinates(arcgisGeometry.paths, isWebMercator),
    };
  }

  if (geometryType === "esriGeometryPolygon" || arcgisGeometry.rings) {
    return {
      type: "polygon",
      rings: projectCoordinates(arcgisGeometry.rings, isWebMercator),
    };
  }

  throw new Error(`Unsupported geometry type: ${geometryType}`);
}

function projectCoordinates(
  coordinates: number[][][],
  isWebMercator: boolean,
): number[][][] {
  if (!isWebMercator) return coordinates;
  return coordinates.map((path) => path.map(([x, y]) => xyToLngLat(x, y)));
}
