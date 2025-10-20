import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Categories from "./Categories";
import {
  categoryController,
  singleCategoryController,
} from "../../../controllers/categoryController.js";
import {
  connectTestDB,
  clearDB,
  disconnectTestDB,
} from "../../../tests/mongoTestEnv.js";

dotenv.config();

// Mock Layout
jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

let server;
let app;
const TEST_PORT = 5071;

// Mount the endpoints Categories / useCategory use.
function mountCategoryEndpoints(app) {
  const router = express.Router();
  router.get("/get-category", categoryController);
  router.get("/single-category/:slug", singleCategoryController);
  app.use("/api/v1/category", router);
}

// Seed DB helpers
async function insertCategories(docs) {
  const mongoose = require("mongoose");
  const coll = mongoose.connection.db.collection("categories");
  const withSlugs = docs.map((d) => ({
    _id: new mongoose.Types.ObjectId(),
    name: d.name,
    slug:
      d.slug ||
      d.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
  }));
  await coll.insertMany(withSlugs);
  return withSlugs.map(({ _id, name, slug }) => ({
    _id: _id.toString(),
    name,
    slug,
  }));
}

async function getCategoryBySlug(slug) {
  const mongoose = require("mongoose");
  const coll = mongoose.connection.db.collection("categories");
  return coll.findOne({ slug });
}

describe("Categories Integration", () => {
  beforeAll(async () => {
    await connectTestDB();

    app = express();
    app.use(cors());
    app.use(express.json());
    mountCategoryEndpoints(app);

    server = app.listen(TEST_PORT);
    axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await clearDB();
    await disconnectTestDB();
  });

  beforeEach(async () => {
    localStorage.clear();
    jest.clearAllMocks();
    await clearDB();
  });

  const renderWithRouter = (ui) =>
    render(<MemoryRouter initialEntries={["/categories"]}>{ui}</MemoryRouter>);

  test("renders buttons for categories", async () => {
    const seeded = await insertCategories([
      { name: "Electronics" },
      { name: "Books" },
    ]);

    renderWithRouter(<Categories />);

    // Wait for category buttons to appear
    for (const c of seeded) {
      const link = await screen.findByRole("link", { name: c.name });
      expect(link).toBeVisible();
      expect(link).toHaveAttribute("href", `/category/${c.slug}`);
    }
  });

  test("returns single category by slug", async () => {
    const [cat] = await insertCategories([{ name: "Stationery", slug: "stationery" }]);

    const res = await axios.get(`/api/v1/category/single-category/${cat.slug}`);
    expect(res.status).toBe(200);
    expect(res.data?.success).toBe(true);
    expect(res.data?.category?.slug).toBe(cat.slug);
    expect(res.data?.category?.name).toBe(cat.name);

    const dbDoc = await getCategoryBySlug(cat.slug);
    expect(dbDoc?.name).toBe(cat.name);
  });

  test("renders empty state (no category links)", async () => {
    await clearDB();

    renderWithRouter(<Categories />);

    await waitFor(() => {
      const links = screen.queryAllByRole("link");
      expect(links.length).toBe(0);
    });
  });
});
