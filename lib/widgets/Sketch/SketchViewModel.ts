import type MapView from "@/views/MapView";
import type GraphicsLayer from "@/layers/GraphicsLayer";
import Graphic from "@/Graphic";
import Point from "@/geometry/Point";
import Polyline from "@/geometry/Polyline";
import Polygon from "@/geometry/Polygon";
import type { Geometry } from "@/Graphic";
import { SimpleMarkerSymbol } from "@/symbols/SimpleMarkerSymbol";
import { SimpleLineSymbol } from "@/symbols/SimpleLineSymbol";
import { SimpleFillSymbol } from "@/symbols/SimpleFillSymbol";
import { Color } from "@/Color";

export type GeometryType = "point" | "multipoint" | "polyline" | "polygon";
export type SketchState = "ready" | "active";

export type CreateEventState = "start" | "active" | "complete" | "cancel";

export interface CreateEvent {
  type: "create";
  state: CreateEventState;
  tool: GeometryType;
  graphic: Graphic | null;
  vertices: number[][];
  _defaultPrevented: boolean;
  preventDefault(): void;
}

export interface UndoEvent {
  type: "undo";
  tool: GeometryType;
  vertices: number[][];
}

export interface RedoEvent {
  type: "redo";
  tool: GeometryType;
  vertices: number[][];
}

export type SketchEvent = CreateEvent | UndoEvent | RedoEvent;

export interface SketchViewModelProperties {
  view: MapView;
  layer?: GraphicsLayer;
  pointSymbol?: any;
  polylineSymbol?: any;
  polygonSymbol?: any;
}

function createDefaultPointSymbol(): SimpleMarkerSymbol {
  return new SimpleMarkerSymbol(
    new Color([0, 120, 212, 1]),
    "circle",
    new SimpleLineSymbol(new Color([255, 255, 255, 1]), 2),
    "10px",
  );
}

function createDefaultPolylineSymbol(): SimpleLineSymbol {
  return new SimpleLineSymbol(new Color([0, 120, 212, 1]), 2, "solid");
}

function createDefaultPolygonSymbol(): SimpleFillSymbol {
  return new SimpleFillSymbol(
    new Color([0, 120, 212, 0.25]),
    "solid",
    new SimpleLineSymbol(new Color([0, 120, 212, 1]), 2),
  );
}

export default class SketchViewModel {
  public view: MapView;
  public layer?: GraphicsLayer;
  public pointSymbol: any;
  public polylineSymbol: any;
  public polygonSymbol: any;

  public state: SketchState = "ready";
  public activeTool: GeometryType | null = null;
  public createGraphic: Graphic | null = null;
  public vertices: number[][] = [];

  private _events: Map<string, Array<(event: any) => void>> = new Map();
  private _overlayCanvas: HTMLCanvasElement | null = null;
  private _overlayCtx: CanvasRenderingContext2D | null = null;
  private _cursorPosition: [number, number] | null = null;
  private _redoStack: number[][] = [];

  private _boundMouseDown: (e: MouseEvent) => void;
  private _boundMouseMove: (e: MouseEvent) => void;
  private _boundDoubleClick: (e: MouseEvent) => void;
  private _boundKeyDown: (e: KeyboardEvent) => void;

  constructor(properties: SketchViewModelProperties) {
    this.view = properties.view;
    this.layer = properties.layer;
    this.pointSymbol = properties.pointSymbol || createDefaultPointSymbol();
    this.polylineSymbol =
      properties.polylineSymbol || createDefaultPolylineSymbol();
    this.polygonSymbol =
      properties.polygonSymbol || createDefaultPolygonSymbol();

    this._boundMouseDown = this._handleMouseDown.bind(this);
    this._boundMouseMove = this._handleMouseMove.bind(this);
    this._boundDoubleClick = this._handleDoubleClick.bind(this);
    this._boundKeyDown = this._handleKeyDown.bind(this);
  }

  create(type: GeometryType): void {
    if (this.state !== "ready") {
      this.cancel();
    }

    this.activeTool = type;
    this.state = "active";
    this.vertices = [];
    this._redoStack = [];
    this.createGraphic = null;
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
    this.activeTool = null;
    this.vertices = [];
    this._redoStack = [];
    this.createGraphic = null;
    this._cursorPosition = null;
    this._clearOverlay();

    this._emitCreate("cancel");
  }

  undo(): void {
    if (this.state !== "active" || this.vertices.length === 0) return;

    const removed = this.vertices.pop()!;
    this._redoStack.push(removed);

    if (this.vertices.length === 0) {
      this.createGraphic = null;
    }

    const event: UndoEvent = {
      type: "undo",
      tool: this.activeTool!,
      vertices: [...this.vertices],
    };
    this._emitEvent("undo", event);
    this._renderTemporary();
  }

  redo(): void {
    if (this.state !== "active" || this._redoStack.length === 0) return;

    const vertex = this._redoStack.pop()!;
    this.vertices.push(vertex);

    const event: RedoEvent = {
      type: "redo",
      tool: this.activeTool!,
      vertices: [...this.vertices],
    };
    this._emitEvent("redo", event);
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

    if (this.activeTool === "point") {
      this._completePoint(mapPoint);
      return;
    }

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

    if (this.activeTool !== "point") {
      this._addVertex(mapPoint);
    }

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

  private _completePoint(mapPoint: [number, number]): void {
    const [lng, lat] = mapPoint;
    const geometry = new Point({ longitude: lng, latitude: lat });
    const graphic = new Graphic({
      geometry,
      symbol: this.pointSymbol,
    });

    if (this.layer) {
      this.layer.graphics = [...this.layer.graphics, graphic];
    }

    this.createGraphic = graphic;

    this._clearOverlay();
    this._deactivate();
    this.state = "ready";
    this.activeTool = null;
    this.vertices = [];
    this._cursorPosition = null;

    this._emitCreate("complete");
  }

  private _complete(): void {
    if (this.vertices.length === 0) {
      this.cancel();
      return;
    }

    const savedVertices = [...this.vertices];

    let geometry: Geometry;

    if (this.activeTool === "multipoint") {
      const [lng, lat] = savedVertices[savedVertices.length - 1];
      geometry = new Point({ longitude: lng, latitude: lat });
    } else if (this.activeTool === "polyline") {
      geometry = new Polyline({
        paths: [savedVertices],
      });
    } else if (this.activeTool === "polygon") {
      geometry = new Polygon({
        rings: [savedVertices],
      });
    } else {
      this.cancel();
      return;
    }

    const symbol =
      this.activeTool === "multipoint"
        ? this.pointSymbol
        : this.activeTool === "polyline"
          ? this.polylineSymbol
          : this.polygonSymbol;

    const graphic = new Graphic({
      geometry,
      symbol,
    });

    if (this.layer) {
      this.layer.graphics = [...this.layer.graphics, graphic];
    }

    this.createGraphic = graphic;

    this._clearOverlay();
    this._deactivate();
    this.state = "ready";
    this.activeTool = null;
    this.vertices = [];
    this._cursorPosition = null;

    this._emitCreate("complete");
  }

  private _emitCreate(state: CreateEventState): CreateEvent {
    const tool = this.activeTool!;
    const event: CreateEvent = {
      type: "create",
      state,
      tool,
      graphic: this.createGraphic,
      vertices: [...this.vertices],
      _defaultPrevented: false,
      preventDefault(this: CreateEvent) {
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

    if (this.activeTool === "polyline") {
      this._renderTempPolyline(ctx);
    } else if (this.activeTool === "polygon") {
      this._renderTempPolygon(ctx);
    }

    if (this._cursorPosition && this.vertices.length > 0) {
      this._drawCursor(ctx);
    }
  }

  private _drawVertex(
    ctx: CanvasRenderingContext2D,
    vertex: number[],
  ): void {
    const [lng, lat] = vertex;
    const [x, y] = this.view.toScreen(lng, lat);

    ctx.fillStyle = "rgba(0, 120, 212, 1)";
    ctx.strokeStyle = "rgba(255, 255, 255, 1)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  private _drawCursor(ctx: CanvasRenderingContext2D): void {
    if (!this._cursorPosition) return;
    const [lng, lat] = this._cursorPosition;
    const [x, y] = this.view.toScreen(lng, lat);

    ctx.strokeStyle = "rgba(0, 120, 212, 0.8)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const size = 10;
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  private _renderTempPolyline(ctx: CanvasRenderingContext2D): void {
    const allPoints = this._cursorPosition
      ? [...this.vertices, this._cursorPosition]
      : this.vertices;

    if (allPoints.length < 2) return;

    ctx.strokeStyle = "rgba(0, 120, 212, 0.6)";
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

    ctx.stroke();
    ctx.setLineDash([]);
  }

  private _renderTempPolygon(ctx: CanvasRenderingContext2D): void {
    const allPoints = this._cursorPosition
      ? [...this.vertices, this._cursorPosition]
      : this.vertices;

    if (allPoints.length < 2) return;

    ctx.strokeStyle = "rgba(0, 120, 212, 0.6)";
    ctx.fillStyle = "rgba(0, 120, 212, 0.15)";
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
}
