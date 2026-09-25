import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const envDir = resolve(__dirname, "..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, "");
  const backend = `http://127.0.0.1:${env.PORT || 4000}`;
  return {
    envDir,
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api": { target: backend, changeOrigin: true },
        "/ws": { target: backend.replace("http", "ws"), ws: true, changeOrigin: true },
      },
    },
    preview: {
      port: 5173,
      proxy: {
        "/api": { target: backend, changeOrigin: true },
        "/ws": { target: backend.replace("http", "ws"), ws: true, changeOrigin: true },
      },
    },
    build: { outDir: "dist", sourcemap: true },
  };
});
