import SketchViewModel from "./SketchViewModel";
import type {
  GeometryType,
  SketchEvent,
  SketchViewModelProperties,
} from "./SketchViewModel";

export interface SketchProperties extends SketchViewModelProperties {}

export default class Sketch {
  public viewModel: SketchViewModel;

  constructor(properties: SketchProperties) {
    this.viewModel = new SketchViewModel(properties);
  }

  create(type: GeometryType): void {
    this.viewModel.create(type);
  }

  reset(): void {
    this.viewModel.reset();
  }

  on(eventType: string, callback: (event: SketchEvent) => void): void {
    this.viewModel.on(eventType, callback);
  }
}
