import MapView from "../MapView";
import Layer from "../../layers/Layer";

export interface LayerViewProperties<T extends Layer = Layer> {
  layer: T;
  view: MapView;
}

export default class LayerView<T extends Layer = Layer> {
  layer: T;
  view: MapView;
  offscreenCanvas: HTMLCanvasElement;
  dirty: boolean = true;

  constructor(properties: LayerViewProperties<T>) {
    this.layer = properties.layer;
    this.view = properties.view;
    this.offscreenCanvas = document.createElement("canvas");
  }

  async render() {}
}
