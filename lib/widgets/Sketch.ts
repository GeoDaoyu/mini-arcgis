import SketchViewModel from "./SketchViewModel";
import type {
  GeometryType,
  SketchState,
  CreateEvent,
  UndoEvent,
  RedoEvent,
  SketchViewModelProperties,
} from "./SketchViewModel";
import type MapView from "@/views/MapView";
import type GraphicsLayer from "@/layers/GraphicsLayer";
import type Graphic from "@/Graphic";

export interface SketchProperties extends SketchViewModelProperties {}

export default class Sketch {
  public viewModel: SketchViewModel;

  constructor(properties: SketchProperties) {
    this.viewModel = new SketchViewModel(properties);
  }

  // ---- delegated properties ----

  get view(): MapView {
    return this.viewModel.view;
  }

  get layer(): GraphicsLayer | undefined {
    return this.viewModel.layer;
  }

  get state(): SketchState {
    return this.viewModel.state;
  }

  get activeTool(): GeometryType | null {
    return this.viewModel.activeTool;
  }

  get createGraphic(): Graphic | null {
    return this.viewModel.createGraphic;
  }

  // ---- delegated methods ----

  create(type: GeometryType): void {
    this.viewModel.create(type);
  }

  complete(): void {
    this.viewModel.complete();
  }

  cancel(): void {
    this.viewModel.cancel();
  }

  undo(): void {
    this.viewModel.undo();
  }

  redo(): void {
    this.viewModel.redo();
  }

  /** @deprecated use cancel() instead */
  reset(): void {
    this.viewModel.reset();
  }

  on(eventType: "create", callback: (event: CreateEvent) => void): void;
  on(eventType: "undo", callback: (event: UndoEvent) => void): void;
  on(eventType: "redo", callback: (event: RedoEvent) => void): void;
  on(eventType: string, callback: (event: any) => void): void {
    this.viewModel.on(eventType, callback);
  }
}
