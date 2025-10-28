import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
    },
    sourcemap: true,
    outDir: "dist",
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
