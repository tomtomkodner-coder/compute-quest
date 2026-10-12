import { defineConfig } from "vite";
import path from "path";
const root = path.resolve(import.meta.dirname, "..");
export default defineConfig({
  root,
  resolve: { alias: [{ find: "@", replacement: path.join(root, "src") }] },
  server: { host: "127.0.0.1", port: 5180, strictPort: true, hmr: false },
  optimizeDeps: { entries: [".preview-tmp/harness.html"] },
});
