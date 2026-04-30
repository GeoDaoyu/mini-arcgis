import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/mini-arcgis",
  resolve: {
    alias: {
      "@": resolve(__dirname, "lib"),
    },
  },
  build: {
    lib: {
      entry: "./lib/main.ts",
      name: "mini-arcgis",
      fileName: "mini-arcgis",
    },
  },
});
