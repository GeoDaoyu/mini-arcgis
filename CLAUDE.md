# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm install` - Install dependencies
- `pnpm start` - Start development server with hot reload (runs Vite)
- `pnpm run build` - Build library source code (TypeScript compilation + Vite build)
- `pnpm run demo` - Build demo version (outputs to `demo/` directory)
- `pnpm run docs:dev` - Start VitePress documentation server
- `pnpm run docs:build` - Build documentation
- `pnpm run docs:preview` - Preview built documentation

## Architecture Overview

This is a lightweight GIS engine inspired by ArcGIS API for JavaScript.

### Core Patterns

- **Map/View Separation**: `Map` manages layers, `MapView` handles canvas rendering and user interaction.
- **Layer System**: Base `Layer` class with concrete implementations (`TileLayer`, `MapImageLayer`, `OpenStreetMapLayer`, `GeoJSONLayer`, `GraphicsLayer`, `FeatureLayer`).
- **LayerView Pattern**: Each layer type creates a corresponding `LayerView` that handles rendering logic.
- **Geometry & Symbols**: Geometry types (`Point`, `Polyline`, `Polygon`) in `lib/geometry/`; symbols (`SimpleMarkerSymbol`, `SimpleLineSymbol`, etc.) in `lib/symbols/`.
- **Spatial Reference**: Web Mercator projection utilities in `lib/geometry/support/webMercatorUtils.ts`.
- **Web Workers**: Heavy data parsing (fetch + GeoJSON→ArcGIS conversion + projection) is offloaded to a shared worker in `lib/workers/` (`parseDataHandler.ts` holds pure, thread-agnostic logic; `parseDataClient.ts` is the main-thread facade with a no-worker fallback). Workers transfer plain `GraphicDescriptor` data, never class instances; the main thread rehydrates them via `graphicFromDescriptor` (`lib/workers/descriptors.ts`). Worker URLs use the Vite idiom `new Worker(new URL("./x.worker.ts", import.meta.url))`; the library build uses a relative `base` so the emitted worker chunk resolves relative to the library file.

### Key Data Flow

1. `Map` contains `Layer` instances.
2. When added to a `MapView`, each layer creates a `LayerView`.
3. `MapView` orchestrates rendering by calling `render()` on each `LayerView`.
4. Coordinate transformations between map coordinates (lng/lat) and screen pixels are handled by `MapView.toMap()` and `MapView.toScreen()`.

### Build Configuration

- **Entry Point**: `lib/main.ts` exports public API (`Map`, `MapView`, layer classes, geometry types).
- **Path Alias**: `@/` maps to `lib/` (configured in `tsconfig.json` and Vite configs).
- **TypeScript**: Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`.
- **Vite**: Two configurations:
  - `vite.config.ts` – library build (outputs ESM and UMD to `dist/`).
  - `vite.config.demo.ts` – demo build (outputs to `demo/`).

### Dependencies

- `@geodaoyu/accessor` – Used for reactive property watching (see `reactiveUtils.watch` in `MapView`).
- `@terraformer/arcgis` – For geometry format conversions.
- **Dev Dependencies**: TypeScript, Vite, VitePress (for documentation).

## Working with the Codebase

- **Source Code**: Primary library code lives in `lib/`. Demo/example code is in `src/`.
- **Adding Layers**: New layer types should extend `Layer` and implement a corresponding `LayerView` (see `lib/views/layers/`).
- **Coordinate Systems**: Most calculations assume Web Mercator (EPSG:3857). Use `webMercatorUtils` for lng/lat ↔ xy conversions.
- **Rendering**: LayerViews render onto the canvas provided by `MapView`. Each `LayerView.render()` is responsible for fetching tiles/data and drawing.

## Notes

- No test suite is currently configured.
- The demo (`src/`) showcases all layer types and is built with `pnpm run demo`.
- Documentation is built with VitePress in `docs/`.

## Deployment (GitHub Pages)

- Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the demo (`pnpm run demo`, output `demo/`) and the docs (`pnpm run docs:build`), then uploads both as one Pages artifact.
- URL layout on the repo's Pages site:
  - Demo: `https://geodaoyu.github.io/mini-arcgis/`
  - Docs: `https://geodaoyu.github.io/mini-arcgis/docs/`
- Docs must be built with `VITEPRESS_BASE=/mini-arcgis/docs/` in CI (see `docs/.vitepress/config.ts`); locally `base` defaults to `/`, so `pnpm docs:dev` behaves as usual. Do not change the docs URL without updating the workflow's `VITEPRESS_BASE`.