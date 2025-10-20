import React from "react";
import {
  connectTestDB,
  clearDB,
  disconnectTestDB,
} from "../../../../tests/mongoTestEnv";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { AuthProvider } from "../../context/auth";
import Products from "./Products";
import authRoutes from "../../../../routes/authRoute.js";
import categoryRoutes from "../../../../routes/categoryRoutes.js";
import productRoutes from "../../../../routes/productRoutes.js";
import Category from "../../../../models/categoryModel.js";
import Product from "../../../../models/productModel.js";
import slugify from "slugify";

dotenv.config();

// mock layout and admin menu
jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));
jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu-mock">Admin Menu</div>
));

let server;
let app;
const TEST_PORT = 5053; // bc its for testing, any uncommon port no. will do (eg. not 5173)
const TEST_ADMIN = {
  name: "Admin User",
  email: `admin_${Date.now()}@example.com`,
  password: "AdminPass!234",
  phone: "12345678",
  address: "Sesame Street",
  answer: "baseball",
};

const SAMPLE_CATEGORY = { name: "Electronics" };

const SAMPLE_PRODUCTS = [
  {
    name: "super toaster oven 2000",
    description: "yum yum in my tum tum",
    photo: {
      data: Buffer.from("fake photo 1"),
      contentType: "image/jpeg",
    },
    price: 50,
    quantity: 2,
    shipping: true,
  },
  {
    name: "air fryer ultra plus",
    description: "crunchy fries guaranteed",
    photo: {
      data: Buffer.from("fake photo 2"),
      contentType: "image/jpeg",
    },
    price: 75,
    quantity: 3,
    shipping: true,
  },
];

let seededCategory;
let seededProducts = [];

const seedCategory = async (db) => {
  const user =
    (await db.collection("users").findOne({ email: TEST_ADMIN.email })) || {};

  const cat = await Category.create({
    name: SAMPLE_CATEGORY.name,
    createdBy: user._id,
  });

  return cat;
};

const seedProducts = async (cat) => {
  const products = await Product.create(
    SAMPLE_PRODUCTS.map((p) => ({
      ...p,
      slug: slugify(p.name, { lower: true }),
      category: cat._id,
      photo: p.photo,
    }))
  );

  return products;
};

describe("Admin Products page integration tests", () => {
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
    await mongoose.connection.db.collection("categories").deleteMany({});
    await mongoose.connection.db.collection("products").deleteMany({});

    seededCategory = await seedCategory(mongoose.connection.db);
    seededProducts = await seedProducts(seededCategory);
  });

  afterAll(async () => {
    if (server) server.close();
    await clearDB();
    await disconnectTestDB();
  });

  const renderWithProviders = () =>
    render(
      <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard/admin/products" element={<Products />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

  test("successfully renders all products", async () => {
    renderWithProviders();

    // assert product name & description
    for (const prod of SAMPLE_PRODUCTS) {
      expect(await screen.findByText(prod.name)).toBeInTheDocument();
      expect(await screen.findByText(prod.description)).toBeInTheDocument();
    }

    // assert product images
    for (const p of seededProducts) {
      const img = screen.getByAltText(p.name);
      expect(img).toHaveAttribute(
        "src",
        `/api/v1/product/product-photo/${p._id}`
      );
    }
  });

  test("displays correct number of product cards", async () => {
    renderWithProviders();

    await waitFor(() => {
      const cards = screen.getAllByRole("img");
      expect(cards.length).toBe(SAMPLE_PRODUCTS.length);
    });
  });

  test("each product has its link to its update page", async () => {
    renderWithProviders();

    for (let i = 0; i < SAMPLE_PRODUCTS.length; i++) {
      const prod = SAMPLE_PRODUCTS[i];
      const seededProd = seededProducts[i];

      // get product name
      const prodName = await screen.findByText(prod.name);

      // get link
      const prodLink = prodName.closest("a");

      // assert href matches the expected update URL
      expect(prodLink).toHaveAttribute(
        "href",
        `/dashboard/admin/product/${seededProd.slug}`
      );
    }
  });

  test("navigates to update page upon clicking that product", async () => {
    // minimal mock update page
    const MockUpdatePage = ({ product }) => (
      <div>
        <h1>Update Product Page</h1>
        <p>{product.name}</p>
        <p>{product.description}</p>
      </div>
    );

    render(
      <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard/admin/products" element={<Products />} />
            <Route
              path="/dashboard/admin/product/:slug"
              element={<MockUpdatePage product={seededProducts[0]} />}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // click first product link
    const firstLink = await screen.findByText(SAMPLE_PRODUCTS[0].name);
    // simulate navigation upon click
    fireEvent.click(firstLink);

    // assert update page header & product info
    await waitFor(() =>
      expect(screen.getByText("Update Product Page")).toBeInTheDocument()
    );
    expect(screen.getByText(seededProducts[0].name)).toBeInTheDocument();
    expect(screen.getByText(seededProducts[0].description)).toBeInTheDocument();
  });
});
