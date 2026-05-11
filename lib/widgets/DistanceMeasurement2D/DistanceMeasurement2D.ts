import DistanceMeasurement2DViewModel from "./DistanceMeasurement2DViewModel";
import type {
  MeasureState,
  MeasureCreateEvent,
  DistanceMeasurement2DViewModelProperties,
} from "./DistanceMeasurement2DViewModel";
import type MapView from "@/views/MapView";
import type GraphicsLayer from "@/layers/GraphicsLayer";
import type Graphic from "@/Graphic";

export interface DistanceMeasurement2DProperties
  extends DistanceMeasurement2DViewModelProperties {}

export default class DistanceMeasurement2D {
  public viewModel: DistanceMeasurement2DViewModel;

  constructor(properties: DistanceMeasurement2DProperties) {
    this.viewModel = new DistanceMeasurement2DViewModel(properties);
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
