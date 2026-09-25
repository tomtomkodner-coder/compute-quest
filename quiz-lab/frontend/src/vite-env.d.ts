/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_DEMO_PIN?: string;
  readonly VITE_DEMO_HOST_TOKEN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
