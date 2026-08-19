import Graphic from "@/Graphic";
import Point from "@/geometry/Point";
import Polyline from "@/geometry/Polyline";
import Polygon from "@/geometry/Polygon";
import type { Geometry } from "@/Graphic";
import type {
  GeometryDescriptor,
  GraphicDescriptor,
} from "./types";

/**
 * Rehydrates plain worker-produced descriptors into library objects on the
 * main thread. Class instances cannot cross the worker boundary, so the
 * worker only sends structured-clone-safe data and we construct the
 * `Graphic`/geometry objects here.
 */
export function graphicFromDescriptor(
  descriptor: GraphicDescriptor,
): Graphic {
  return new Graphic({
    geometry: geometryFromDescriptor(descriptor.geometry),
    attributes: descriptor.attributes,
  });
}

export function geometryFromDescriptor(
  descriptor: GeometryDescriptor,
): Geometry {
  switch (descriptor.type) {
    case "point":
      return new Point({
        longitude: descriptor.longitude,
        latitude: descriptor.latitude,
      });
    case "polyline":
      return new Polyline({ paths: descriptor.paths });
    case "polygon":
      return new Polygon({ rings: descriptor.rings });
  }
}
