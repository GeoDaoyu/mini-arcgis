import Layer from "./layers/Layer";
import Basemap from "./Basemap";
import { Accessor } from "@geodaoyu/accessor";

export interface MapProperties {
  layers?: Layer[];
  basemap?: Basemap;
}

export default class Map extends Accessor {
  public layers: Layer[];
  public basemap: Basemap | undefined;

  constructor(properties: MapProperties = {}) {
    super();
    this.layers = properties.layers || [];
    this.basemap = properties.basemap;
  }

  add(layer: Layer): void {
    this.layers = [...this.layers, layer];
  }

  remove(layer: Layer): Layer {
    this.layers = this.layers.filter((l) => l.id !== layer.id);
    return layer;
  }

  get allLayers(): Layer[] {
    const basemapLayers = this.basemap?.baseLayers || [];
    return [...basemapLayers, ...this.layers];
  }

  findLayerById(id: string): Layer | undefined {
    return (
      this.layers.find((layer) => layer.id === id) ||
      this.basemap?.baseLayers.find((layer) => layer.id === id)
    );
  }

  removeAll(): void {
    this.layers = [];
  }
}
