import { test as base, expect } from "@playwright/test";
import dotenv from "dotenv";
import createApp from "../app.js";
import { connectTestDB, disconnectTestDB, clearDB } from "./mongoTestEnv.js";

dotenv.config();

const TEST_PORT = Number(process.env.PLAYWRIGHT_API_PORT) || 6060;

const gracefulClose = (server) =>
  new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

const test = base.extend({
  appServer: [
    async ({}, use) => {
      await connectTestDB();
      await clearDB();

      const app = createApp();
      const server = app.listen(TEST_PORT);

      try {
        await use({ port: TEST_PORT });
      } finally {
        await gracefulClose(server);
        await disconnectTestDB();
      }
    },
    { scope: "worker", auto: true },
  ],
});

export { test, expect };
