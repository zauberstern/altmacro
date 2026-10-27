import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  use: { baseURL: "http://127.0.0.1:4174" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174/altmacro/",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
