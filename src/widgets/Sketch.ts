import SketchViewModel from "@/widgets/Sketch/SketchViewModel";
import type { GeometryType } from "@/widgets/Sketch/SketchViewModel";
import type MapView from "@/views/MapView";
import type GraphicsLayer from "@/layers/GraphicsLayer";

interface ToolConfig {
  button: HTMLElement;
  type: GeometryType;
}

function getElement<T extends HTMLElement>(id: string): T {
  return document.getElementById(id)! as T;
}

export default function initSketch(
  view: MapView,
  sketchLayer: GraphicsLayer,
): () => void {
  const sketchViewModel = new SketchViewModel({
    view,
    layer: sketchLayer,
  });

  const buttonConfigs: Record<string, ToolConfig> = {
    "sketch-point-btn": {
      button: getElement("sketch-point-btn"),
      type: "point",
    },
    "sketch-polyline-btn": {
      button: getElement("sketch-polyline-btn"),
      type: "polyline",
    },
    "sketch-polygon-btn": {
      button: getElement("sketch-polygon-btn"),
      type: "polygon",
    },
  };

  const allButtons = Object.values(buttonConfigs).map((c) => c.button);

  function clearActiveButton(): void {
    allButtons.forEach((btn) => btn.classList.remove("active"));
  }

  function setActiveButton(button: HTMLElement | null): void {
    clearActiveButton();
    if (button) {
      button.classList.add("active");
    }
  }

  Object.entries(buttonConfigs).forEach(([, { button, type }]) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("active")) {
        sketchViewModel.cancel();
        setActiveButton(null);
        return;
      }
      sketchViewModel.create(type);
      setActiveButton(button);
    });
  });

  sketchViewModel.on("create", (event) => {
    if (event.state === "complete" || event.state === "cancel") {
      setActiveButton(null);
    }
  });

  const undoBtn = getElement("sketch-undo-btn");
  undoBtn.addEventListener("click", () => {
    sketchViewModel.undo();
  });

  const redoBtn = getElement("sketch-redo-btn");
  redoBtn.addEventListener("click", () => {
    sketchViewModel.redo();
  });

  const clearBtn = getElement("sketch-reset-btn");
  clearBtn.addEventListener("click", () => {
    sketchLayer.graphics = [];
    sketchViewModel.cancel();
    setActiveButton(null);
  });

  // Return cleanup function
  return () => {
    sketchViewModel.cancel();
  };
}
