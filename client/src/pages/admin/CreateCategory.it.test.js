import React from "react";
import {
  connectTestDB,
  clearDB,
  disconnectTestDB,
} from "../../../../tests/mongoTestEnv";
import Category from "../../../../models/categoryModel";
import "@testing-library/jest-dom";
import axios from "axios";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import categoryRoutes from "../../../../routes/categoryRoutes.js";

dotenv.config();

jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu-mock">Admin Menu</div>
));

// sample data
const SAMPLE_CATEGORIES = [{ name: "Electronics" }, { name: "Books" }];

let server;
let app;
const TEST_PORT = 5050; // any uncommon port no. will do (eg. not 5173)

beforeAll(async () => {
  await connectTestDB();

  app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/v1/category", categoryRoutes);

  server = app.listen(TEST_PORT);
  axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;
});

beforeEach(async () => {
  await clearDB();
  await Category.insertMany(SAMPLE_CATEGORIES); // seed sample categories
});

afterAll(async () => {
  if (server) server.close();
  await disconnectTestDB();
});

describe("Create Category page integration tests", () => {
  test("successfully gets all categories", async () => {
    // test if can all the seeded cats are retrieved correctly
    const res = await axios.get("/api/v1/category/get-category");

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.category).toHaveLength(SAMPLE_CATEGORIES.length);
    expect(res.data.category[0].name).toBe(SAMPLE_CATEGORIES[0].name);
    expect(res.data.category[1].name).toBe(SAMPLE_CATEGORIES[1].name);
  });
});
