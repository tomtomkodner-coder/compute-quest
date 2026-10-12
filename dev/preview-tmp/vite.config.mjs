import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
const root = path.resolve(import.meta.dirname, "..");
export default defineConfig({
  root,
  plugins: [react(), tailwindcss()],
  resolve: { alias: [{ find: "@tanstack/react-router", replacement: path.join(root, ".preview-tmp/shim-router.tsx") }, { find: "@", replacement: path.join(root, "src") }] },
  define: { "process.env.NODE_ENV": '"production"', "import.meta.env.DEV": "false" },
  build: {
    outDir: path.join(root, ".preview-tmp/dist"), emptyOutDir: true, cssCodeSplit: false,
    lib: { entry: path.join(root, ".preview-tmp/main.tsx"), formats: ["iife"], name: "M", fileName: () => "app.js" },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
