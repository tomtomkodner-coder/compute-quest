import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
const root = path.resolve(import.meta.dirname, "..");
export default defineConfig({
  root,
  plugins: [react(), tailwindcss()],
  resolve: { alias: [{ find: "@tanstack/react-router", replacement: path.join(root, ".preview-tmp/shim-router.tsx") }, { find: "@", replacement: path.join(root, "src") }] },
  server: { host: "127.0.0.1", port: 5181, strictPort: true, hmr: false, watch: { usePolling: false } },
  optimizeDeps: { entries: [".preview-tmp/app.html"] },
});
