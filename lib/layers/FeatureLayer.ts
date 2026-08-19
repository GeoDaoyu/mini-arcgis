import Layer, { LayerProperties, LayerType } from "./Layer";
import type Graphic from "@/Graphic";
import MapView from "@/views/MapView";
import FeatureLayerView from "@/views/layers/FeatureLayerView";
import { Renderer } from "@/renderers/Renderer";
import { graphicFromDescriptor } from "@/workers/descriptors";
import { requestParseData } from "@/workers/parseDataClient";

export interface FeatureLayerProperties extends LayerProperties {
  source?: Graphic[];
  url?: string;
  renderer?: Renderer;
}

export default class FeatureLayer extends Layer {
  readonly type: LayerType = "feature";
  url?: string;
  source: Graphic[];
  renderer?: Renderer;

  constructor(properties: FeatureLayerProperties) {
    super(properties);
    this.url = properties.url;
    this.source = properties.source || [];
    this.renderer = properties.renderer;

    if (properties.url) {
      this.loadFromUrl(properties.url);
    }
  }

  private async loadFromUrl(url: string) {
    try {
      // Fetching + parsing + Web Mercator → lng/lat projection run in a
      // Web Worker, so large feature sets don't block the main thread.
      const descriptors = await requestParseData("load-features", { url });
      this.source = descriptors.map(graphicFromDescriptor);
    } catch (error) {
      console.error("Failed to load FeatureLayer:", error);
    }
  }

  createLayerView(view: MapView): FeatureLayerView {
    return new FeatureLayerView({ view, layer: this });
  }
}
