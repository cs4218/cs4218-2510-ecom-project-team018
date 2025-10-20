import { defineConfig } from "@playwright/test";

const reuseServer = !process.env.CI;

export default defineConfig({
  testDir: "./src/pages",
  testMatch: ["**/*.spec.js"],
  timeout: 40000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: !!process.env.CI,
    viewport: { width: 1280, height: 720 },
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm start",
      url: "http://localhost:3000",
      reuseExistingServer: reuseServer,
      timeout: 180000,
      cwd: ".",
      env: {
        BROWSER: "none",
        PORT: "3000",
      },
    },
  ],
});
