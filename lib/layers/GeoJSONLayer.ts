import Layer, { LayerProperties, LayerType } from "./Layer";
import type Graphic from "@/Graphic";
import { Renderer } from "@/renderers/Renderer";
import MapView from "@/views/MapView";
import GeoJSONLayerView from "@/views/layers/GeoJSONLayerView";
import { graphicFromDescriptor } from "@/workers/descriptors";
import { requestParseData } from "@/workers/parseDataClient";

export interface GeoJSONLayerProperties extends LayerProperties {
  url: string;
  renderer?: Renderer;
}

export default class GeoJSONLayer extends Layer {
  readonly type: LayerType = "geojson";
  url: string;
  source: Graphic[] = [];
  renderer?: Renderer;

  constructor(properties: GeoJSONLayerProperties) {
    super(properties);
    this.url = properties.url;
    this.renderer = properties.renderer;

    this.loadFromUrl(properties.url);
  }

  private async loadFromUrl(url: string) {
    try {
      // Fetching + GeoJSON → ArcGIS conversion + parsing run in a Web
      // Worker, so large datasets don't block the main thread. The worker
      // returns plain descriptors which are rehydrated into Graphics here.
      const descriptors = await requestParseData("load-geojson", { url });
      this.source = descriptors.map(graphicFromDescriptor);
    } catch (error) {
      console.error("Failed to load GeoJSON:", error);
    }
  }

  createLayerView(view: MapView): GeoJSONLayerView {
    return new GeoJSONLayerView({ view, layer: this });
  }
}
