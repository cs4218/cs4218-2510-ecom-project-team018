import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 50000,
  testDir: "./src/pages",
  testMatch: ["**/*.spec.js"],
  use: {
    baseURL: "http://localhost:3000",
    headless: false,
    viewport: { width: 1280, height: 720 },
  },
});
