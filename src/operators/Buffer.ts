import SketchViewModel from "@/widgets/Sketch/SketchViewModel";
import type { GeometryType } from "@/widgets/Sketch/SketchViewModel";
import type MapView from "@/views/MapView";
import type GraphicsLayer from "@/layers/GraphicsLayer";
import Graphic from "@/Graphic";
import type { Geometry } from "@/Graphic";
import { execute, type LengthUnit } from "@/geometry/operators/bufferOperator";
import { SimpleFillSymbol } from "@/symbols/SimpleFillSymbol";
import { SimpleLineSymbol } from "@/symbols/SimpleLineSymbol";
import { Color } from "@/Color";

interface BtnConfig {
  button: HTMLElement;
  type: GeometryType;
}

function getElement<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export default function initBuffer(
  view: MapView,
  inputLayer: GraphicsLayer,
  bufferLayer: GraphicsLayer,
): () => void {
  const sketchVM = new SketchViewModel({
    view,
    layer: inputLayer,
  });

  let lastGeometry: Geometry | null = null;

  const btnConfig: Record<string, BtnConfig> = {
    "buffer-point-btn": {
      button: getElement("buffer-point-btn"),
      type: "point",
    },
    "buffer-polyline-btn": {
      button: getElement("buffer-polyline-btn"),
      type: "polyline",
    },
    "buffer-polygon-btn": {
      button: getElement("buffer-polygon-btn"),
      type: "polygon",
    },
  };

  const allSketchBtns = Object.values(btnConfig).map((c) => c.button);
  const runBtn = getElement("buffer-run-btn");
  const clearBtn = getElement("buffer-clear-btn");
  const distanceInput = getElement<HTMLInputElement>("buffer-distance");
  const unitSelect = getElement<HTMLSelectElement>("buffer-unit");

  function clearActiveButton(): void {
    allSketchBtns.forEach((b) => b.classList.remove("active"));
  }

  function setActiveButton(button: HTMLElement | null): void {
    clearActiveButton();
    if (button) {
      button.classList.add("active");
    }
  }

  Object.entries(btnConfig).forEach(([, { button, type }]) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("active")) {
        sketchVM.cancel();
        setActiveButton(null);
        return;
      }
      sketchVM.create(type);
      setActiveButton(button);
    });
  });

  sketchVM.on("create", (event) => {
    if (event.state === "complete") {
      setActiveButton(null);
      lastGeometry = event.graphic?.geometry ?? null;
    } else if (event.state === "cancel") {
      setActiveButton(null);
    }
  });

  runBtn.addEventListener("click", () => {
    if (!lastGeometry) return;

    const distance = parseFloat(distanceInput.value);
    if (isNaN(distance) || distance <= 0) return;

    const unit = unitSelect.value as LengthUnit;

    const buffered = execute(lastGeometry, distance, { unit });

    if (!buffered) return;

    const symbol = new SimpleFillSymbol(
      new Color([255, 140, 0, 0.35]),
      "solid",
      new SimpleLineSymbol(new Color([255, 140, 0, 1]), 2),
    );

    const graphic = new Graphic({
      geometry: buffered,
      symbol,
    });

    bufferLayer.graphics = [graphic];
  });

  clearBtn.addEventListener("click", () => {
    inputLayer.graphics = [];
    bufferLayer.graphics = [];
    lastGeometry = null;
    sketchVM.cancel();
    setActiveButton(null);
  });

  return () => {
    sketchVM.cancel();
  };
}
