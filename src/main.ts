import MapView from "@/views/MapView";
import Map from "@/Map";
import GraphicsLayer from "@/layers/GraphicsLayer";
import initSketch from "./widgets/Sketch";
import { layerExamples, layerIdToName, layerConfig } from "./examples";

const map = new Map();

// dedicated layer for sketch results
const sketchLayer = new GraphicsLayer({ id: "sketch-layer", title: "Sketch" });

const view = new MapView({
  map,
  container: "view",
  center: [120, 30],
  zoom: 6,
});

view.map.add(layerExamples["OpenStreetMapLayer"].layer);
view.map.add(sketchLayer); // sketch on top

initSketch(view, sketchLayer);

// ---- Layer Panel ----

const codePanelTitle = document.getElementById(
  "code-panel-title",
) as HTMLSpanElement;
const codeDisplay = document.getElementById("code-display") as HTMLElement;
const prevBtn = document.getElementById("code-prev-btn") as HTMLButtonElement;
const nextBtn = document.getElementById("code-next-btn") as HTMLButtonElement;

let activeLayers: string[] = ["OpenStreetMapLayer"];
let currentLayerIndex = 0;

function updateCodePanel() {
  if (activeLayers.length === 0) {
    codePanelTitle.textContent = "No Layer Selected";
    codeDisplay.textContent = "";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  if (currentLayerIndex >= activeLayers.length) {
    currentLayerIndex = activeLayers.length - 1;
  }

  const currentLayerId = activeLayers[currentLayerIndex];
  const layerData = layerExamples[currentLayerId];
  if (layerData) {
    codePanelTitle.textContent = layerIdToName[currentLayerId];
    codeDisplay.textContent = layerData.code;
  }

  prevBtn.disabled = currentLayerIndex === 0;
  nextBtn.disabled = currentLayerIndex === activeLayers.length - 1;
}

prevBtn?.addEventListener("click", () => {
  if (currentLayerIndex > 0) {
    currentLayerIndex--;
    updateCodePanel();
  }
});

nextBtn?.addEventListener("click", () => {
  if (currentLayerIndex < activeLayers.length - 1) {
    currentLayerIndex++;
    updateCodePanel();
  }
});

function toggleLayer(layerId: string) {
  const layer = layerExamples[layerId].layer;
  const exists = view.map.findLayerById(layerId);

  if (exists) {
    view.map.remove(layer);
    const index = activeLayers.indexOf(layerId);
    if (index > -1) {
      activeLayers.splice(index, 1);
      if (currentLayerIndex >= activeLayers.length) {
        currentLayerIndex = Math.max(0, activeLayers.length - 1);
      }
    }
  } else {
    // insert before sketch layer to keep sketch on top
    const layers = [...view.map.layers];
    const sketchIdx = layers.findIndex((l) => l.id === "sketch-layer");
    const insertIdx = sketchIdx !== -1 ? sketchIdx : layers.length;
    layers.splice(insertIdx, 0, layer);
    view.map.layers = layers;

    if (!activeLayers.includes(layerId)) {
      activeLayers.push(layerId);
    }
  }
  updateCodePanel();
}

Object.entries(layerConfig).forEach(([id, { checkboxId }]) => {
  const checkbox = document.getElementById(checkboxId) as HTMLInputElement;
  checkbox?.addEventListener("change", () => toggleLayer(id));
});

updateCodePanel();
