import MapView from "@/views/MapView";
import Map from "@/Map";
import Basemap from "@/Basemap";
import GraphicsLayer from "@/layers/GraphicsLayer";
import initSketch from "./widgets/Sketch";
import initMeasurement from "./widgets/Measurement";
import initBuffer from "./operators/Buffer";
import { layerExamples, layerIdToName, layerConfig } from "./examples";

const map = new Map();

const basemapLayerIds = ["TileLayer", "OpenStreetMapLayer", "TianDiTuLayer", "MapImageLayer"];

const basemap = new Basemap({
  id: "demo-basemap",
  title: "Demo Basemap",
  baseLayers: [layerExamples["OpenStreetMapLayer"].layer],
});
map.basemap = basemap;

// dedicated layer for sketch results
const sketchLayer = new GraphicsLayer({ id: "sketch-layer", title: "Sketch" });

const view = new MapView({
  map,
  container: "view",
  center: [120, 30],
  zoom: 6,
});

view.map.add(sketchLayer); // sketch on top
const measurementLayer = new GraphicsLayer({
  id: "measurement-layer",
  title: "Measurement",
});
view.map.add(measurementLayer); // measurement on top

// buffer layers
const bufferInputLayer = new GraphicsLayer({
  id: "buffer-input-layer",
  title: "Buffer Input",
});
const bufferResultLayer = new GraphicsLayer({
  id: "buffer-result-layer",
  title: "Buffer Result",
});
view.map.add(bufferInputLayer);
view.map.add(bufferResultLayer);

initSketch(view, sketchLayer);
initMeasurement(view, measurementLayer);
initBuffer(view, bufferInputLayer, bufferResultLayer);

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
    if (basemapLayerIds.includes(layerId)) {
      view.map.basemap!.baseLayers = view.map.basemap!.baseLayers.filter(
        (l) => l.id !== layerId,
      );
    } else {
      view.map.remove(layer);
    }
    const index = activeLayers.indexOf(layerId);
    if (index > -1) {
      activeLayers.splice(index, 1);
      if (currentLayerIndex >= activeLayers.length) {
        currentLayerIndex = Math.max(0, activeLayers.length - 1);
      }
    }
  } else {
    if (basemapLayerIds.includes(layerId)) {
      view.map.basemap!.baseLayers = [
        ...view.map.basemap!.baseLayers,
        layer,
      ];
    } else {
      // insert before sketch layer to keep sketch on top
      const layers = [...view.map.layers];
      const sketchIdx = layers.findIndex((l) => l.id === "sketch-layer");
      const insertIdx = sketchIdx !== -1 ? sketchIdx : layers.length;
      layers.splice(insertIdx, 0, layer);
      view.map.layers = layers;
    }

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
