import React from "react";
import {
  connectTestDB,
  clearDB,
  disconnectTestDB,
} from "../../../../tests/mongoTestEnv";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { AuthProvider } from "../../context/auth";
import UpdateProduct from "./UpdateProduct";
import authRoutes from "../../../../routes/authRoute.js";
import categoryRoutes from "../../../../routes/categoryRoutes.js";
import productRoutes from "../../../../routes/productRoutes.js";
import Category from "../../../../models/categoryModel.js";
import Product from "../../../../models/productModel.js";
import slugify from "slugify";

dotenv.config();

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
const TEST_PORT = 5052; // bc its for testing, any uncommon port no. will do (eg. not 5173)

const TEST_ADMIN = {
  name: "Admin User",
  email: `admin_${Date.now()}@example.com`,
  password: "AdminPass!234",
  phone: "12345678",
  address: "sesame street",
  answer: "baseball",
};

const SAMPLE_CATEGORIES = [{ name: "Electronics" }, { name: "Books" }];
let seededCategory;
let seededCategory2;
let seededProduct;

// seed helpers
const seedCategories = async (db) => {
  const user =
    (await db.collection("users").findOne({ email: TEST_ADMIN.email })) || {};
  const categories = await Category.create([
    { name: SAMPLE_CATEGORIES[0].name, createdBy: user._id },
    { name: SAMPLE_CATEGORIES[1].name, createdBy: user._id },
  ]);

  return categories;
};

const seedProduct = async (category) => {
  const name = "super toaster oven 4000";
  const product = await Product.create({
    name,
    slug: slugify(name, { lower: true }),
    description: "yum yum in my tum tum",
    price: 50,
    quantity: 2,
    shipping: true,
    category: category._id,
    photo: {
      data: Buffer.from("fake photo jpg"),
      contentType: "image/jpeg",
    },
  });

  return product;
};

describe("Update Product page integration tests", () => {
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
    const cats = await seedCategories(mongoose.connection.db);
    seededCategory = cats[0];
    seededCategory2 = cats[1];
    seededProduct = await seedProduct(seededCategory);
  });

  afterAll(async () => {
    if (server) server.close();
    await clearDB();
    await disconnectTestDB();
  });

  const renderWithProviders = (slug) =>
    render(
      <MemoryRouter initialEntries={[`/dashboard/admin/product/${slug}`]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/dashboard/admin/product/:slug"
              element={<UpdateProduct />}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

  test("successfully populates category drop down", async () => {
    renderWithProviders(seededProduct.slug);

    const categorySelect = await screen.findByText(seededCategory.name);
    fireEvent.mouseDown(categorySelect);

    for (const cat of SAMPLE_CATEGORIES) {
      const option = await screen.findByRole("option", { name: cat.name });
      expect(option).toBeInTheDocument();
    }
  });

  test("successfully loads existing product data", async () => {
    renderWithProviders(seededProduct.slug);

    // wait for data fetch
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/write a name/i)).toHaveValue(
        seededProduct.name
      )
    );

    // cat
    const categorySelect = screen.getByText(seededCategory.name);
    expect(categorySelect).toBeInTheDocument();

    // photo
    const photoImg = screen.getByAltText("product_photo");
    expect(photoImg).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${seededProduct._id}`
    );

    // input fields
    expect(screen.getByPlaceholderText(/write a description/i)).toHaveValue(
      seededProduct.description
    );
    expect(screen.getByPlaceholderText(/write a price/i)).toHaveValue(
      seededProduct.price
    );
    expect(screen.getByPlaceholderText(/write a quantity/i)).toHaveValue(
      seededProduct.quantity
    );

    // shipping
    expect(
      screen.getByText(seededProduct.shipping ? "Yes" : "No")
    ).toBeInTheDocument();
  });

  test("successfully updates a product", async () => {
    const updatedProductData = {
      name: "super toaster oven pro max 5000",
      description: "yum yum in my tum tum 2.0",
      price: 123,
      quantity: 10,
      category: seededCategory2,
      shipping: false,
      photo: new File(["fake png content"], "updated.png", {
        type: "image/png",
      }),
    };

    renderWithProviders(seededProduct.slug);

    // wait for data fetch
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/write a name/i)).toHaveValue(
        seededProduct.name
      )
    );

    /*** change product info ***/
    // change cat
    const categorySelect = screen.getAllByRole("combobox")[0];
    fireEvent.mouseDown(categorySelect);
    const categoryOption = await screen.findByText(
      updatedProductData.category.name
    );
    fireEvent.click(categoryOption);

    // change photo
    const fileInput = screen.getByLabelText(/upload photo/i);
    fireEvent.change(fileInput, {
      target: { files: [updatedProductData.photo] },
    });

    // input fields
    fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
      target: { value: updatedProductData.name },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a description/i), {
      target: { value: updatedProductData.description },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a price/i), {
      target: { value: updatedProductData.price },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a quantity/i), {
      target: { value: updatedProductData.quantity },
    });

    // change shipping
    const shippingSelect = screen.getAllByRole("combobox")[1];
    fireEvent.mouseDown(shippingSelect);
    const newShippingOption = await screen.findByText(
      updatedProductData.shipping ? "Yes" : "No"
    );
    fireEvent.click(newShippingOption);

    // click update button
    const updateButton = screen.getByRole("button", {
      name: /update product/i,
    });
    fireEvent.click(updateButton);

    // assert in db
    await waitFor(async () => {
      const updated = await Product.findById(seededProduct._id);

      expect(updated.category.toString()).toBe(
        updatedProductData.category._id.toString()
      );
      expect(updated.photo).toBeDefined();
      expect(updated.photo.data).toBeDefined();
      expect(updated.photo.contentType).toBe("image/png");
      expect(updated.name).toBe(updatedProductData.name);
      expect(updated.description).toBe(updatedProductData.description);
      expect(updated.price).toBe(updatedProductData.price);
      expect(updated.quantity).toBe(updatedProductData.quantity);
      expect(updated.shipping).toBe(updatedProductData.shipping);
    });
  });

  test("successfully deletes a product", async () => {
    // mock window.prompt so affirm deletion
    window.prompt = jest.fn(() => "yes");

    renderWithProviders(seededProduct.slug);

    // wait for data fetch
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/write a name/i)).toHaveValue(
        seededProduct.name
      )
    );

    const deleteButton = screen.getByRole("button", {
      name: /delete product/i,
    });
    fireEvent.click(deleteButton);

    // assert product doesnt exist in db
    await waitFor(async () => {
      const deleted = await Product.findById(seededProduct._id);
      expect(deleted).toBeNull();
    });

    // restore window.prompt
    window.prompt.mockRestore();
  });
});
