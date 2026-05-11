export interface LayerExample {
  code: string;
  layer: any;
}

interface LayerModule {
  default: any;
}

const modules = import.meta.glob<LayerModule>("./*.ts", { eager: true });
const rawCodes = import.meta.glob<string>("./*.ts", { query: "?raw", import: "default", eager: true });

interface LayerConfig {
  name: string;
  checkboxId: string;
}

const layerConfig: Record<string, LayerConfig> = {
  TileLayer: { name: "TileLayer", checkboxId: "tile-layer" },
  OpenStreetMapLayer: { name: "OpenStreetMapLayer", checkboxId: "openstreetmap-layer" },
  TianDiTuLayer: { name: "TianDiTuLayer", checkboxId: "tianditu-layer" },
  GraphicsLayer: { name: "GraphicsLayer", checkboxId: "graphics-layer" },
  MapImageLayer: { name: "MapImageLayer", checkboxId: "mapimage-layer" },
  FeatureLayer: { name: "FeatureLayer", checkboxId: "feature-layer" },
  FeatureLayerWithSource: { name: "FeatureLayer", checkboxId: "feature-source-layer" },
  GeoJSONLayer: { name: "GeoJSONLayer", checkboxId: "geojson-layer" },
};

export const layerExamples: Record<string, LayerExample> = {};
export const layerIdToName: Record<string, string> = {};

for (const [id, config] of Object.entries(layerConfig)) {
  const filePath = `./${id}.ts`;
  const module = modules[filePath];
  const rawCode = rawCodes[filePath];
  layerExamples[id] = { code: rawCode || "", layer: module.default };
  layerIdToName[id] = config.name;
}

export { layerConfig };
