import React from "react";
import {
  connectTestDB,
  clearDB,
  disconnectTestDB,
} from "../../../../tests/mongoTestEnv";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { AuthProvider } from "../../context/auth";
import CreateCategory from "./CreateCategory";
import authRoutes from "../../../../routes/authRoute.js";
import categoryRoutes from "../../../../routes/categoryRoutes.js";
import Category from "../../../../models/categoryModel.js";

dotenv.config();

jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu-mock">Admin Menu</div>
));

let server;
let app;
const TEST_PORT = 5050; // bc its for testing, any uncommon port no. will do (eg. not 5173)

// sample data
const TEST_ADMIN = {
  name: "Admin User",
  email: `admin_${Date.now()}@example.com`,
  password: "AdminPass!234",
  phone: "12345678",
  address: "sesame street",
  answer: "baseball",
};

const SAMPLE_CATEGORIES = [{ name: "Electronics" }, { name: "Books" }];

const seedData = async (db) => {
  const user =
    (await db.collection("users").findOne({ email: TEST_ADMIN.email })) || {};

  const categories = await Category.create([
    { name: SAMPLE_CATEGORIES[0].name, createdBy: user._id },
    { name: SAMPLE_CATEGORIES[1].name, createdBy: user._id },
  ]);
};

describe("Create Category page integration tests", () => {
  beforeAll(async () => {
    await connectTestDB();

    app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/api/v1/auth", authRoutes);
    app.use("/api/v1/category", categoryRoutes);

    server = app.listen(TEST_PORT);
    axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;

    // register admin
    await axios.post("/api/v1/auth/register", TEST_ADMIN);
    // manually change to admin role
    await mongoose.connection.db
      .collection("users")
      .updateOne({ email: TEST_ADMIN.email }, { $set: { role: 1 } });

    // login to get token
    const loginRes = await axios.post("/api/v1/auth/login", {
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
    });

    // persist auth (so <AuthProvider> reads it)
    localStorage.setItem("auth", JSON.stringify(loginRes.data));
  });

  beforeEach(async () => {
    await mongoose.connection.db.collection("categories").deleteMany({}); // clear categories
    await seedData(mongoose.connection.db); // seed sample categories
  });

  afterAll(async () => {
    if (server) server.close();
    await clearDB();
    await disconnectTestDB();
  });

  const renderWithProviders = () =>
    render(
      <MemoryRouter initialEntries={["/dashboard/admin/create-category"]}>
        <AuthProvider>
          <CreateCategory />
        </AuthProvider>
      </MemoryRouter>
    );

  test("successfully gets all categories", async () => {
    // test if can all the seeded cats are retrieved correctly
    renderWithProviders();

    for (const cat of SAMPLE_CATEGORIES) {
      await waitFor(() =>
        expect(screen.getByText(cat.name)).toBeInTheDocument()
      );
    }
  });

  test("successfully creates a new category", async () => {
    const newCategory = { name: "Toys" };

    renderWithProviders();

    // fill input
    const input = await screen.findByPlaceholderText(/Enter new category/i);
    fireEvent.change(input, { target: { value: newCategory.name } });

    // click submit
    const submitButton = screen.getByRole("button", { name: /Submit/i });
    fireEvent.click(submitButton);

    // assert new cat exists
    await waitFor(() =>
      expect(screen.getByText(newCategory.name)).toBeInTheDocument()
    );
  });
  //   test("successfully updates an existing category", async () => {});
  //   test("successfully deletes an existing category", async () => {});
});
