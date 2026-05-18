import LayerView from "./LayerView";
import WebTileLayer from "../../layers/WebTileLayer";
import { lngLatToXY } from "../../geometry/support/webMercatorUtils";

export default class WebTileLayerView<T extends WebTileLayer = WebTileLayer> extends LayerView<T> {
  async render() {
    try {
      const { zoom } = this.view;
      const ctx = this.offscreenCanvas.getContext("2d");
      if (!ctx) return;

      const bbox = this.getBBox();
      const [xmin, ymin, xmax, ymax] = bbox;

      const tileRange = this.getTileRange(xmin, ymin, xmax, ymax, zoom);

      await this.drawTiles(ctx, tileRange, zoom, this.offscreenCanvas.width, this.offscreenCanvas.height);
    } catch (error) {
      console.error("Error in WebTileLayerView render method:", error);
    }
  }

  protected getTileRange(
    xmin: number,
    ymin: number,
    xmax: number,
    ymax: number,
    zoom: number,
  ): {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
  } {
    const tileSize = 256;
    const worldSize = 256 * Math.pow(2, zoom);

    const worldOrigin = 20037508.34;
    const xToPixel = (x: number) =>
      ((x + worldOrigin) / (2 * worldOrigin)) * worldSize;
    const yToPixel = (y: number) =>
      worldSize - ((y + worldOrigin) / (2 * worldOrigin)) * worldSize;

    const minCol = Math.floor(xToPixel(xmin) / tileSize);
    const maxCol = Math.floor(xToPixel(xmax) / tileSize);
    const minRow = Math.floor(yToPixel(ymax) / tileSize);
    const maxRow = Math.floor(yToPixel(ymin) / tileSize);

    return {
      minCol: Math.max(0, minCol),
      maxCol: Math.min(Math.pow(2, zoom) - 1, maxCol),
      minRow: Math.max(0, minRow),
      maxRow: Math.min(Math.pow(2, zoom) - 1, maxRow),
    };
  }

  protected async drawTiles(
    ctx: CanvasRenderingContext2D,
    tileRange: {
      minCol: number;
      maxCol: number;
      minRow: number;
      maxRow: number;
    },
    zoom: number,
    canvasWidth: number,
    canvasHeight: number,
  ): Promise<void> {
    const tileSize = 256;
    const worldSize = 256 * Math.pow(2, zoom);
    const worldOrigin = 20037508.34;

    const { center } = this.view;
    const [centerX, centerY] = lngLatToXY(center[0], center[1]);

    const centerPixelX =
      ((centerX + worldOrigin) / (2 * worldOrigin)) * worldSize;
    const centerPixelY =
      worldSize - ((centerY + worldOrigin) / (2 * worldOrigin)) * worldSize;

    const offsetX = centerPixelX - canvasWidth / 2;
    const offsetY = centerPixelY - canvasHeight / 2;

    const promises: Promise<void>[] = [];

    for (let col = tileRange.minCol; col <= tileRange.maxCol; col++) {
      for (let row = tileRange.minRow; row <= tileRange.maxRow; row++) {
        const x = col * tileSize - offsetX;
        const y = row * tileSize - offsetY;

        if (
          x + tileSize > 0 &&
          x < canvasWidth &&
          y + tileSize > 0 &&
          y < canvasHeight
        ) {
          promises.push(this.drawTile(ctx, col, row, zoom, x, y));
        }
      }
    }

    await Promise.all(promises);
  }

  protected async drawTile(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    zoom: number,
    x: number,
    y: number,
  ): Promise<void> {
    const tileSize = 256;

    try {
      const image = await this.loadTile(col, row, zoom);
      ctx.drawImage(image, x, y, tileSize, tileSize);
    } catch (error) {
      console.warn(`Failed to load tile ${zoom}/${col}/${row}:`, error);
    }
  }

  protected async loadTile(
    col: number,
    row: number,
    zoom: number,
  ): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = this.layer.url
        .replace("{z}", zoom.toString())
        .replace("{x}", col.toString())
        .replace("{y}", row.toString());

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load tile: ${url}`));

      img.src = url;
    });
  }

  getBBox(): [number, number, number, number] {
    const { tileInfo, zoom, canvas, center } = this.view;
    const currentLOD = tileInfo.lods.find((lod) => lod.level === zoom);
    if (!currentLOD) {
      throw new Error(`No LOD found for zoom level ${zoom}`);
    }

    const resolution = currentLOD.resolution;
    const width = canvas.width;
    const height = canvas.height;

    const halfWidthMapUnits = (width * resolution) / 2;
    const halfHeightMapUnits = (height * resolution) / 2;

    const [centerX, centerY] = lngLatToXY(center[0], center[1]);

    const xmin = centerX - halfWidthMapUnits;
    const xmax = centerX + halfWidthMapUnits;
    const ymin = centerY - halfHeightMapUnits;
    const ymax = centerY + halfHeightMapUnits;

    return [xmin, ymin, xmax, ymax];
  }
}
