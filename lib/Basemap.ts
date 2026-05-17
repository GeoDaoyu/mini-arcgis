import Layer from "./layers/Layer";
import { Accessor } from "@geodaoyu/accessor";

export interface BasemapProperties {
  baseLayers?: Layer[];
  id: string | null | undefined;
  title: string;
}

export default class Basemap extends Accessor {
  public baseLayers: Layer[];
  public id: string | null | undefined;
  public title: string;

  constructor(properties: BasemapProperties) {
    super();
    this.baseLayers = properties.baseLayers || [];
    this.id = properties.id;
    this.title = properties.title || "Basemap";
  }
}
