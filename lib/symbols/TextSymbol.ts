import { Color } from "../Color";
import { Symbol } from "./Symbol";
import { Font } from "./Font";

export class TextSymbol extends Symbol {
  text: string;
  xoffset: number;
  yoffset: number;
  haloColor: Color;
  haloSize: string;
  font: Font;

  constructor(properties: {
    text: string;
    color?: Color;
    haloColor?: Color;
    haloSize?: string;
    xoffset?: number;
    yoffset?: number;
    font?: Font;
  }) {
    super(properties.color || new Color([255, 255, 255, 1]), "text");
    this.text = properties.text;
    this.xoffset = properties.xoffset ?? 0;
    this.yoffset = properties.yoffset ?? 0;
    this.haloColor = properties.haloColor || new Color([0, 0, 0, 0.7]);
    this.haloSize = properties.haloSize || "1px";
    this.font = properties.font || new Font();
  }
}
