import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/pages",
  testMatch: ["**/*.spec.js"],
  use: {
    baseURL: "http://localhost:3000",
    headless: false,
    viewport: { width: 1920, height: 1080 },
  },
});
