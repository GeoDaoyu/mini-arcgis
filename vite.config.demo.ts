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
    outDir: "demo",
    rollupOptions: {
      input: "./index.html",
    },
  },
});
