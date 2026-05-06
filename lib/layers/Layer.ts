import { Accessor } from "@geodaoyu/accessor";
import MapView from "@/views/MapView";
import LayerView from "@/views/layers/LayerView";
import type { LayerType } from "./types";

export interface LayerProperties {
  id?: string;
  title?: string;
  type?: LayerType;
}

export default class Layer extends Accessor {
  id: string;
  title?: string;
  readonly type: LayerType;

  constructor(properties: LayerProperties) {
    super();
    this.id = properties.id || crypto.randomUUID();
    this.title = properties.title;
    this.type = properties.type || "unknown";
  }
  createLayerView(view: MapView): LayerView {
    return new LayerView({ view, layer: this });
  }
}

export type { LayerType };
