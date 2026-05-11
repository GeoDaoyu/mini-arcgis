import type MapView from "@/views/MapView";
import type GraphicsLayer from "@/layers/GraphicsLayer";
import Graphic from "@/Graphic";
import Polygon from "@/geometry/Polygon";
import Point from "@/geometry/Point";
import { SimpleFillSymbol } from "@/symbols/SimpleFillSymbol";
import { SimpleLineSymbol } from "@/symbols/SimpleLineSymbol";
import { TextSymbol } from "@/symbols/TextSymbol";
import { Font } from "@/symbols/Font";
import { Color } from "@/Color";
import { arcgisToGeoJSON } from "@terraformer/arcgis";
import { area, centroid } from "@turf/turf";

export type MeasureState = "ready" | "active";
export type MeasureCreateState = "start" | "active" | "complete" | "cancel";

export interface MeasureCreateEvent {
  type: "create";
  state: MeasureCreateState;
  graphic: Graphic | null;
  labelGraphic: Graphic | null;
  vertices: number[][];
  _defaultPrevented: boolean;
  preventDefault(): void;
}

export type MeasureEvent = MeasureCreateEvent;

export interface AreaMeasurement2DViewModelProperties {
  view: MapView;
  layer?: GraphicsLayer;
  polygonSymbol?: any;
}

function createDefaultPolygonSymbol(): SimpleFillSymbol {
  return new SimpleFillSymbol(
    new Color([227, 139, 79, 0.25]),
    "solid",
    new SimpleLineSymbol(new Color([227, 139, 79, 1]), 2),
  );
}

export default class AreaMeasurement2DViewModel {
  public view: MapView;
  public layer?: GraphicsLayer;
  public polygonSymbol: any;

  public state: MeasureState = "ready";
  public vertices: number[][] = [];
  public measureGraphic: Graphic | null = null;
  public labelGraphic: Graphic | null = null;

  private _events: Map<string, Array<(event: any) => void>> = new Map();
  private _overlayCanvas: HTMLCanvasElement | null = null;
  private _overlayCtx: CanvasRenderingContext2D | null = null;
  private _cursorPosition: [number, number] | null = null;
  private _redoStack: number[][] = [];

  private _boundMouseDown: (e: MouseEvent) => void;
  private _boundMouseMove: (e: MouseEvent) => void;
  private _boundDoubleClick: (e: MouseEvent) => void;
  private _boundKeyDown: (e: KeyboardEvent) => void;

  constructor(properties: AreaMeasurement2DViewModelProperties) {
    this.view = properties.view;
    this.layer = properties.layer;
    this.polygonSymbol =
      properties.polygonSymbol || createDefaultPolygonSymbol();

    this._boundMouseDown = this._handleMouseDown.bind(this);
    this._boundMouseMove = this._handleMouseMove.bind(this);
    this._boundDoubleClick = this._handleDoubleClick.bind(this);
    this._boundKeyDown = this._handleKeyDown.bind(this);
  }

  start(): void {
    if (this.state !== "ready") {
      this.cancel();
    }

    this.state = "active";
    this.vertices = [];
    this._redoStack = [];
    this.measureGraphic = null;
    this.labelGraphic = null;
    this._cursorPosition = null;

    this._activate();
    this._emitCreate("start");
  }

  complete(): void {
    if (this.state !== "active") return;
    this._complete();
  }

  cancel(): void {
    if (this.state !== "active") return;

    this._deactivate();
    this.state = "ready";
    this.vertices = [];
    this._redoStack = [];
    this.measureGraphic = null;
    this.labelGraphic = null;
    this._cursorPosition = null;
    this._clearOverlay();

    this._emitCreate("cancel");
  }

  undo(): void {
    if (this.state !== "active" || this.vertices.length === 0) return;

    const removed = this.vertices.pop()!;
    this._redoStack.push(removed);

    this._renderTemporary();
  }

  redo(): void {
    if (this.state !== "active" || this._redoStack.length === 0) return;

    const vertex = this._redoStack.pop()!;
    this.vertices.push(vertex);

    this._renderTemporary();
  }

  on(eventType: string, callback: (event: any) => void): void {
    if (!this._events.has(eventType)) {
      this._events.set(eventType, []);
    }
    this._events.get(eventType)!.push(callback);
  }

  // ---- internal ----

  private _activate(): void {
    const { canvas } = this.view;

    canvas.tabIndex = 0;
    canvas.focus();

    canvas.addEventListener("mousedown", this._boundMouseDown, true);
    canvas.addEventListener("mousemove", this._boundMouseMove, true);
    canvas.addEventListener("dblclick", this._boundDoubleClick, true);
    canvas.addEventListener("keydown", this._boundKeyDown);

    this._createOverlay();
  }

  private _deactivate(): void {
    const { canvas } = this.view;

    canvas.removeEventListener("mousedown", this._boundMouseDown, true);
    canvas.removeEventListener("mousemove", this._boundMouseMove, true);
    canvas.removeEventListener("dblclick", this._boundDoubleClick, true);
    canvas.removeEventListener("keydown", this._boundKeyDown);

    this._removeOverlay();
  }

  private _createOverlay(): void {
    const { canvas } = this.view;
    const parent = canvas.parentElement;
    if (!parent) return;

    const overlay = document.createElement("canvas");
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "1";

    parent.appendChild(overlay);
    this._overlayCanvas = overlay;
    this._overlayCtx = overlay.getContext("2d");
  }

  private _removeOverlay(): void {
    if (this._overlayCanvas) {
      this._overlayCanvas.remove();
      this._overlayCanvas = null;
      this._overlayCtx = null;
    }
  }

  private _clearOverlay(): void {
    if (this._overlayCtx && this._overlayCanvas) {
      this._overlayCtx.clearRect(
        0,
        0,
        this._overlayCanvas.width,
        this._overlayCanvas.height,
      );
    }
  }

  private _handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const mapPoint = this.view.toMap(event);
    this._addVertex(mapPoint);
  }

  private _handleMouseMove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const mapPoint = this.view.toMap(event);
    this._cursorPosition = mapPoint;

    this._renderTemporary();
  }

  private _handleDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.vertices.length === 0) return;

    const mapPoint = this.view.toMap(event);
    this._addVertex(mapPoint);

    this._complete();
  }

  private _handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "c" || event.key === "C") {
      event.preventDefault();
      if (this.vertices.length > 0) {
        this._complete();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.cancel();
      return;
    }

    if (event.ctrlKey && event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      this.undo();
      return;
    }

    if (
      (event.ctrlKey && event.key === "y") ||
      (event.ctrlKey && event.shiftKey && event.key === "z")
    ) {
      event.preventDefault();
      this.redo();
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      this.undo();
    }
  }

  private _addVertex(mapPoint: [number, number]): void {
    const ev = this._emitCreate("active");

    if (ev._defaultPrevented) return;

    this.vertices.push(mapPoint);
    this._redoStack = [];
    this._renderTemporary();
  }

  private _complete(): void {
    if (this.vertices.length < 3) {
      this.cancel();
      return;
    }

    const savedVertices = [...this.vertices];

    const geometry = new Polygon({
      rings: [savedVertices],
    });

    const polygonGraphic = new Graphic({
      geometry,
      symbol: this.polygonSymbol,
    });

    let labelGraphic: Graphic | null = null;
    try {
      const { area: sqMeters, centroid: center } =
        this._calculateArea(savedVertices);
      const text = AreaMeasurement2DViewModel._formatArea(sqMeters);
      const labelPoint = new Point({
        longitude: center[0],
        latitude: center[1],
      });
      const labelSymbol = new TextSymbol({
        text,
        color: new Color([255, 255, 255, 1]),
        haloColor: new Color([0, 0, 0, 0.7]),
        haloSize: "2px",
        font: new Font(14, "sans-serif", "bold"),
      });
      labelGraphic = new Graphic({
        geometry: labelPoint,
        symbol: labelSymbol,
      });
    } catch {
      // fallback label at middle vertex
      const midIdx = Math.floor(savedVertices.length / 2);
      const [mLng, mLat] = savedVertices[midIdx];
      const labelPoint = new Point({ longitude: mLng, latitude: mLat });
      const labelSymbol = new TextSymbol({ text: "?" });
      labelGraphic = new Graphic({
        geometry: labelPoint,
        symbol: labelSymbol,
      });
    }

    if (this.layer) {
      this.layer.graphics = [
        ...this.layer.graphics,
        polygonGraphic,
        ...(labelGraphic ? [labelGraphic] : []),
      ];
    }

    this.measureGraphic = polygonGraphic;
    this.labelGraphic = labelGraphic;

    this._clearOverlay();
    this._deactivate();
    this.state = "ready";
    this.vertices = [];
    this._cursorPosition = null;

    this._emitCreate("complete");
  }

  private _emitCreate(state: MeasureCreateState): MeasureCreateEvent {
    const event: MeasureCreateEvent = {
      type: "create",
      state,
      graphic: this.measureGraphic,
      labelGraphic: this.labelGraphic,
      vertices: [...this.vertices],
      _defaultPrevented: false,
      preventDefault(this: MeasureCreateEvent) {
        this._defaultPrevented = true;
      },
    };

    this._emitEvent("create", event);
    return event;
  }

  private _emitEvent(type: string, event: any): void {
    const callbacks = this._events.get(type) || [];
    for (const callback of callbacks) {
      callback(event);
    }
  }

  // ---- measurement ----

  private static _formatArea(sqMeters: number): string {
    if (sqMeters < 1_000_000) {
      return `${Math.round(sqMeters)} sq m`;
    }
    return `${(sqMeters / 1_000_000).toFixed(2)} sq km`;
  }

  private _calculateArea(vertices: number[][]): {
    area: number;
    centroid: [number, number];
  } {
    if (vertices.length < 3) {
      return { area: 0, centroid: (vertices[0] as [number, number]) || [0, 0] };
    }

    // close the ring for proper polygon area calculation
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    const alreadyClosed =
      first[0] === last[0] && first[1] === last[1];
    const closedRing = alreadyClosed ? vertices : [...vertices, first];

    const geojson = arcgisToGeoJSON({ rings: [closedRing] });
    const a = area(geojson);
    const center = centroid(geojson);
    const coords = center.geometry.coordinates as [number, number];

    return { area: a, centroid: coords };
  }

  // ---- temporary rendering ----

  private _renderTemporary(): void {
    const ctx = this._overlayCtx;
    const canvas = this._overlayCanvas;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.vertices.length === 0 && !this._cursorPosition) return;

    for (const vertex of this.vertices) {
      this._drawVertex(ctx, vertex);
    }

    this._renderTempPolygon(ctx);
    this._renderMeasurementLabel(ctx);
  }

  private _drawVertex(
    ctx: CanvasRenderingContext2D,
    vertex: number[],
  ): void {
    const [lng, lat] = vertex;
    const [x, y] = this.view.toScreen(lng, lat);

    ctx.fillStyle = "rgba(227, 139, 79, 1)";
    ctx.strokeStyle = "rgba(255, 255, 255, 1)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  private _renderTempPolygon(ctx: CanvasRenderingContext2D): void {
    const allPoints = this._cursorPosition
      ? [...this.vertices, this._cursorPosition]
      : this.vertices;

    if (allPoints.length < 2) return;

    ctx.strokeStyle = "rgba(227, 139, 79, 0.6)";
    ctx.fillStyle = "rgba(227, 139, 79, 0.15)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);

    ctx.beginPath();
    const [firstLng, firstLat] = allPoints[0];
    const [firstX, firstY] = this.view.toScreen(firstLng, firstLat);
    ctx.moveTo(firstX, firstY);

    for (let i = 1; i < allPoints.length; i++) {
      const [lng, lat] = allPoints[i];
      const [x, y] = this.view.toScreen(lng, lat);
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private _renderMeasurementLabel(ctx: CanvasRenderingContext2D): void {
    const allPoints = this._cursorPosition
      ? [...this.vertices, this._cursorPosition]
      : this.vertices;

    if (allPoints.length < 3) return;

    try {
      const { area: sqMeters, centroid: center } =
        this._calculateArea(allPoints);
      const text = AreaMeasurement2DViewModel._formatArea(sqMeters);
      const [x, y] = this.view.toScreen(center[0], center[1]);

      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
      ctx.lineWidth = 3;
      ctx.strokeText(text, x, y);

      ctx.fillStyle = "rgba(255, 255, 255, 1)";
      ctx.fillText(text, x, y);
    } catch {
      // skip label if geometry is invalid for turf
    }
  }
}
