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
import CreateProduct from "./CreateProduct";
import authRoutes from "../../../../routes/authRoute.js";
import categoryRoutes from "../../../../routes/categoryRoutes.js";
import productRoutes from "../../../../routes/productRoutes.js"; // make sure you have this
import Category from "../../../../models/categoryModel.js";
import Product from "../../../../models/productModel.js";
import slugify from "slugify";

dotenv.config();

// Mock Layout and AdminMenu
jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu-mock">Admin Menu</div>
));

global.URL.createObjectURL = jest.fn(() => "mocked-url");

let server;
let app;
let seededCategory;
const TEST_PORT = 5051; // bc its for testing, any uncommon port no. will do (eg. not 5173)

const TEST_ADMIN = {
  name: "Admin User",
  email: `admin_${Date.now()}@example.com`,
  password: "AdminPass!234",
  phone: "12345678",
  address: "sesame street",
  answer: "baseball",
};

const SAMPLE_CATEGORIES = [{ name: "Electronics" }, { name: "Books" }];

const seedCategories = async (db) => {
  const user =
    (await db.collection("users").findOne({ email: TEST_ADMIN.email })) || {};

  const categories = await Category.create([
    { name: SAMPLE_CATEGORIES[0].name, createdBy: user._id },
    { name: SAMPLE_CATEGORIES[1].name, createdBy: user._id },
  ]);

  return categories;
};

describe("Create Product page integration tests", () => {
  beforeAll(async () => {
    await connectTestDB();

    app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/api/v1/auth", authRoutes);
    app.use("/api/v1/category", categoryRoutes);
    app.use("/api/v1/product", productRoutes);

    server = app.listen(TEST_PORT);
    axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;

    // register admin
    await axios.post("/api/v1/auth/register", TEST_ADMIN);
    // manually change to admin role
    await mongoose.connection.db
      .collection("users")
      .updateOne({ email: TEST_ADMIN.email }, { $set: { role: 1 } });

    const loginRes = await axios.post("/api/v1/auth/login", {
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
    });

    // persist auth (so <AuthProvider> reads it)
    localStorage.setItem("auth", JSON.stringify(loginRes.data));
  });

  beforeEach(async () => {
    // clear & seed again
    await mongoose.connection.db.collection("categories").deleteMany({});
    await mongoose.connection.db.collection("products").deleteMany({});
    const cats = await seedCategories(mongoose.connection.db);
    seededCategory = cats[0];
  });

  afterAll(async () => {
    if (server) server.close();
    await clearDB();
    await disconnectTestDB();
  });

  const renderWithProviders = () =>
    render(
      <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
        <AuthProvider>
          <CreateProduct />
        </AuthProvider>
      </MemoryRouter>
    );

  test("successfully gets all categories on load", async () => {
    renderWithProviders();

    // open category dropdown
    const categoryTrigger = await screen.findByText(/select a category/i);
    fireEvent.mouseDown(categoryTrigger);

    // assert seeded categories are shown
    for (const cat of SAMPLE_CATEGORIES) {
      await waitFor(() =>
        expect(screen.getByText(cat.name)).toBeInTheDocument()
      );
    }
  });

  test("successfully creates a new product", async () => {
    const newProductData = {
      name: "super toaster oven 3000",
      description: "yum yum in my tum tum",
      price: "999",
      quantity: "5",
      shipping: true,
      category: seededCategory,
      photo: new File(["dummy"], "test.jpg", { type: "image/jpeg" }),
    };

    renderWithProviders();

    // wait for category fetch to complete (so main form renders)
    await waitFor(() => {
      expect(screen.getByText(/select a category/i)).toBeInTheDocument();
    });

    // select cat
    const categoryTrigger = await screen.findByText(/select a category/i);
    fireEvent.mouseDown(categoryTrigger);
    const categoryOption = await screen.findByText(
      newProductData.category.name
    );
    fireEvent.click(categoryOption);

    // upload photo
    const fileInput = screen.getByLabelText(/upload photo/i);
    fireEvent.change(fileInput, { target: { files: [newProductData.photo] } });

    // input fields
    fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
      target: { value: newProductData.name },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a description/i), {
      target: { value: newProductData.description },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a price/i), {
      target: { value: newProductData.price },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a quantity/i), {
      target: { value: newProductData.quantity },
    });

    // select shipping
    const selectShipping = screen.getAllByRole("combobox")[1];
    fireEvent.mouseDown(selectShipping);
    const newShippingOption = await screen.findByText(
      newProductData.shipping ? "Yes" : "No"
    );
    fireEvent.click(newShippingOption);

    // click create button
    const createButton = screen.getByRole("button", {
      name: /create product/i,
    });
    fireEvent.click(createButton);

    // assert in db
    await waitFor(async () => {
      const product = await Product.findOne({
        name: newProductData.name,
      });

      expect(product).not.toBeNull();

      // assert all fields
      expect(product.name).toBe(newProductData.name);
      expect(product.description).toBe(newProductData.description);
      expect(product.price).toBe(Number(newProductData.price));
      expect(product.quantity).toBe(Number(newProductData.quantity));
      expect(product.shipping).toBe(newProductData.shipping);
      expect(product.category.toString()).toBe(
        newProductData.category._id.toString()
      );
      expect(product.slug).toBe(slugify(newProductData.name, { lower: true }));
      expect(product.photo).toBeDefined();
      expect(product.photo.data).toBeDefined();
      expect(product.photo.contentType).toBe("image/jpeg");
    });
  });
});
