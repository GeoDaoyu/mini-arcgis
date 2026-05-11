import DistanceMeasurement2DViewModel from "@/widgets/DistanceMeasurement2D/DistanceMeasurement2DViewModel";
import AreaMeasurement2DViewModel from "@/widgets/AreaMeasurement2D/AreaMeasurement2DViewModel";
import type MapView from "@/views/MapView";
import type GraphicsLayer from "@/layers/GraphicsLayer";

export default function initMeasurement(
  view: MapView,
  measurementLayer: GraphicsLayer,
): () => void {
  const distanceVM = new DistanceMeasurement2DViewModel({
    view,
    layer: measurementLayer,
  });
  const areaVM = new AreaMeasurement2DViewModel({
    view,
    layer: measurementLayer,
  });

  const distBtn = document.getElementById("measure-distance-btn")!;
  const areaBtn = document.getElementById("measure-area-btn")!;
  const clearBtn = document.getElementById("measurement-clear-btn")!;
  const toolBtns = [distBtn, areaBtn];

  function clearActive(): void {
    toolBtns.forEach((b) => b.classList.remove("active"));
  }

  function cancelAll(): void {
    distanceVM.cancel();
    areaVM.cancel();
    clearActive();
  }

  distBtn.addEventListener("click", () => {
    if (distBtn.classList.contains("active")) {
      distanceVM.cancel();
      clearActive();
      return;
    }
    cancelAll();
    distanceVM.start();
    distBtn.classList.add("active");
  });

  areaBtn.addEventListener("click", () => {
    if (areaBtn.classList.contains("active")) {
      areaVM.cancel();
      clearActive();
      return;
    }
    cancelAll();
    areaVM.start();
    areaBtn.classList.add("active");
  });

  distanceVM.on("create", (event) => {
    if (event.state === "complete" || event.state === "cancel") {
      clearActive();
    }
  });
  areaVM.on("create", (event) => {
    if (event.state === "complete" || event.state === "cancel") {
      clearActive();
    }
  });

  clearBtn.addEventListener("click", () => {
    measurementLayer.graphics = [];
    cancelAll();
  });

  return () => {
    distanceVM.cancel();
    areaVM.cancel();
  };
}
