import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{shared,backend,plugins,frontend}/test/**/*.test.ts"],
    environment: "node",
    testTimeout: 15000,
  },
});
