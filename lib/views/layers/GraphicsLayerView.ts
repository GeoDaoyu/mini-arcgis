import { reactiveUtils } from "@geodaoyu/accessor";
import LayerView from "./LayerView";
import GraphicsLayer from "@/layers/GraphicsLayer";
import { SimpleMarkerSymbol } from "@/symbols/SimpleMarkerSymbol";
import { SimpleLineSymbol } from "@/symbols/SimpleLineSymbol";
import { SimpleFillSymbol } from "@/symbols/SimpleFillSymbol";
import { TextSymbol } from "@/symbols/TextSymbol";
import MapView from "../MapView";

export default class GraphicsLayerView extends LayerView<GraphicsLayer> {
  constructor(properties: { view: MapView; layer: GraphicsLayer }) {
    super(properties);

    reactiveUtils.watch(
      () => this.layer.graphics,
      () => {
        this.dirty = true;
        this.view.render();
      },
    );
  }

  async render() {
    const ctx = this.offscreenCanvas.getContext("2d");
    if (!ctx) return;

    const defaultSymbols = new Map<string, () => any>([
      ["point", () => new SimpleMarkerSymbol()],
      ["polyline", () => new SimpleLineSymbol()],
      ["polygon", () => new SimpleFillSymbol()],
    ]);

    const renderers = new Map<string, (graphic: any, symbol: any) => void>([
      [
        "point",
        (graphic, symbol) => {
          if (!("longitude" in graphic.geometry)) return;
          const [screenX, screenY] = this.view.toScreen(
            graphic.geometry.longitude,
            graphic.geometry.latitude,
          );
          this.renderMarker(ctx, screenX, screenY, symbol);
        },
      ],
      [
        "polyline",
        (graphic, symbol) => {
          if (!("paths" in graphic.geometry)) return;
          this.renderPolyline(ctx, graphic.geometry.paths, symbol);
        },
      ],
      [
        "polygon",
        (graphic, symbol) => {
          if (!("rings" in graphic.geometry)) return;
          this.renderPolygon(ctx, graphic.geometry.rings, symbol);
        },
      ],
      [
        "text",
        (graphic, symbol) => {
          if (!("longitude" in graphic.geometry)) return;
          const [screenX, screenY] = this.view.toScreen(
            graphic.geometry.longitude,
            graphic.geometry.latitude,
          );
          this.renderText(ctx, screenX, screenY, symbol);
        },
      ],
    ]);

    this.layer.graphics
      .map((graphic) => ({
        graphic,
        symbol:
          graphic.symbol ?? defaultSymbols.get(graphic.geometry.type)?.(),
      }))
      .filter(({ symbol }) => symbol)
      .forEach(({ graphic, symbol }) => {
        const key = symbol?.type === "text" ? "text" : graphic.geometry.type;
        renderers.get(key)?.(graphic, symbol);
      });
  }

  private renderMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    symbol: SimpleMarkerSymbol,
  ) {
    const size = parseInt(symbol.size) || 8;
    const radius = size / 2;

    ctx.fillStyle = `rgba(${symbol.color.r}, ${symbol.color.g}, ${symbol.color.b}, ${symbol.color.a})`;

    if (symbol.style === "circle") {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    } else if (symbol.style === "square") {
      ctx.fillRect(x - radius, y - radius, size, size);
    }

    if (symbol.outline) {
      ctx.strokeStyle = `rgba(${symbol.outline.color.r}, ${symbol.outline.color.g}, ${symbol.outline.color.b}, ${symbol.outline.color.a})`;
      ctx.lineWidth = 1;

      if (symbol.style === "circle") {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (symbol.style === "square") {
        ctx.strokeRect(x - radius, y - radius, size, size);
      }
    }
  }

  private renderText(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    symbol: TextSymbol,
  ) {
    const offsetX = x + (symbol.xoffset ?? 0);
    const offsetY = y + (symbol.yoffset ?? 0);

    ctx.font = symbol.font.toString();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (symbol.haloColor) {
      ctx.strokeStyle = `rgba(${symbol.haloColor.r}, ${symbol.haloColor.g}, ${symbol.haloColor.b}, ${symbol.haloColor.a})`;
      ctx.lineWidth = parseInt(symbol.haloSize) || 1;
      ctx.strokeText(symbol.text, offsetX, offsetY);
    }

    ctx.fillStyle = `rgba(${symbol.color.r}, ${symbol.color.g}, ${symbol.color.b}, ${symbol.color.a})`;
    ctx.fillText(symbol.text, offsetX, offsetY);
  }

  private renderPolyline(
    ctx: CanvasRenderingContext2D,
    paths: number[][][],
    symbol: SimpleLineSymbol,
  ) {
    ctx.beginPath();

    for (const path of paths) {
      if (path.length === 0) continue;

      const [firstLng, firstLat] = path[0];
      const [firstX, firstY] = this.view.toScreen(firstLng, firstLat);
      ctx.moveTo(firstX, firstY);

      for (let i = 1; i < path.length; i++) {
        const [lng, lat] = path[i];
        const [x, y] = this.view.toScreen(lng, lat);
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = `rgba(${symbol.color.r}, ${symbol.color.g}, ${symbol.color.b}, ${symbol.color.a})`;
    ctx.lineWidth = symbol.width || 1;
    ctx.stroke();
  }

  private renderPolygon(
    ctx: CanvasRenderingContext2D,
    rings: number[][][],
    symbol: SimpleFillSymbol,
  ) {
    ctx.beginPath();

    for (const ring of rings) {
      if (ring.length === 0) continue;

      const [firstLng, firstLat] = ring[0];
      const [firstX, firstY] = this.view.toScreen(firstLng, firstLat);
      ctx.moveTo(firstX, firstY);

      for (let i = 1; i < ring.length; i++) {
        const [lng, lat] = ring[i];
        const [x, y] = this.view.toScreen(lng, lat);
        ctx.lineTo(x, y);
      }

      ctx.closePath();
    }

    if (symbol.color) {
      ctx.fillStyle = `rgba(${symbol.color.r}, ${symbol.color.g}, ${symbol.color.b}, ${symbol.color.a})`;
      ctx.fill();
    }

    if (symbol.outline) {
      ctx.strokeStyle = `rgba(${symbol.outline.color.r}, ${symbol.outline.color.g}, ${symbol.outline.color.b}, ${symbol.outline.color.a})`;
      ctx.lineWidth = symbol.outline.width || 1;
      ctx.stroke();
    }
  }
}
