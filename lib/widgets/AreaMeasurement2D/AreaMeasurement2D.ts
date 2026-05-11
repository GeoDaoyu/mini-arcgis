import AreaMeasurement2DViewModel from "./AreaMeasurement2DViewModel";
import type {
  MeasureState,
  MeasureCreateEvent,
  AreaMeasurement2DViewModelProperties,
} from "./AreaMeasurement2DViewModel";
import type MapView from "@/views/MapView";
import type GraphicsLayer from "@/layers/GraphicsLayer";
import type Graphic from "@/Graphic";

export interface AreaMeasurement2DProperties
  extends AreaMeasurement2DViewModelProperties {}

export default class AreaMeasurement2D {
  public viewModel: AreaMeasurement2DViewModel;

  constructor(properties: AreaMeasurement2DProperties) {
    this.viewModel = new AreaMeasurement2DViewModel(properties);
  }

  get view(): MapView {
    return this.viewModel.view;
  }

  get layer(): GraphicsLayer | undefined {
    return this.viewModel.layer;
  }

  get state(): MeasureState {
    return this.viewModel.state;
  }

  get measureGraphic(): Graphic | null {
    return this.viewModel.measureGraphic;
  }

  get labelGraphic(): Graphic | null {
    return this.viewModel.labelGraphic;
  }

  start(): void {
    this.viewModel.start();
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

  on(eventType: "create", callback: (event: MeasureCreateEvent) => void): void {
    this.viewModel.on(eventType, callback);
  }
}
