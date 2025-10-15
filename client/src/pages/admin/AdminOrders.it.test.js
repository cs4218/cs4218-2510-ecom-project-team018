import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import AdminOrders from "./AdminOrders";
import { AuthProvider } from "../../context/auth";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "../../../../routes/authRoute.js";
import Order from "../../../../models/orderModel.js";
import Product from "../../../../models/productModel.js";

dotenv.config();

// Mock Layout and AdminMenu to avoid external dependencies
jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu-mock">Admin Menu</div>
));

// Mock antd Select to a native select for reliable onChange
jest.mock("antd", () => {
  const React = require("react");
  const Select = ({ defaultValue, onChange, children }) => (
    <select
      aria-label="status"
      defaultValue={defaultValue}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
  const Option = ({ value, children }) => (
    <option value={value}>{children}</option>
  );
  Select.Option = Option;
  return { Select };
});

let server;
let app;
const TEST_PORT = 5006;

const ADMIN_USER = {
  name: "Admin Orders",
  email: `admin_orders_${Date.now()}@example.com`,
  password: "AdminOrders!234",
  phone: "5555555555",
  address: "Admin Orders St",
  answer: "orders",
};

const seedData = async (db) => {
  // Create minimal product and order
  const product = await Product.create({
    name: "Test Product",
    slug: `test-product-${Date.now()}`,
    description: "A product for order testing",
    price: 99,
    category: new mongoose.Types.ObjectId(),
    quantity: 10,
  });

  const user =
    (await db.collection("users").findOne({ email: ADMIN_USER.email })) || {};

  const order = await Order.create({
    products: [product._id],
    payment: { success: true },
    buyer: user._id,
    status: "Not Processed",
  });

  return { product, order };
};

describe("AdminOrders Integration", () => {
  beforeAll(async () => {
    const uri = process.env.MONGO_URL_TEST;
    await mongoose.connect(uri);
    await mongoose.connection.db.dropDatabase();

    app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/api/v1/auth", authRoutes);

    server = app.listen(TEST_PORT);
    axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;

    // Register admin and promote to role 1
    await axios.post("/api/v1/auth/register", ADMIN_USER);
    await mongoose.connection.db
      .collection("users")
      .updateOne({ email: ADMIN_USER.email }, { $set: { role: 1 } });

    // Seed orders and products
    await seedData(mongoose.connection.db);
    // ensure orders are created
    expect(await Order.countDocuments()).toBe(1);
  });

  afterAll(async () => {
    if (server) server.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  const renderWithProviders = () => {
    return render(
      <MemoryRouter initialEntries={["/dashboard/admin/orders"]}>
        <AuthProvider>
          <AdminOrders />
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it("does not render orders when user is not admin", async () => {
    renderWithProviders();
    expect(screen.queryByText("Test Product")).not.toBeInTheDocument();
  });

  it("renders orders for admin", async () => {
    const loginRes = await axios.post("/api/v1/auth/login", {
      email: ADMIN_USER.email,
      password: ADMIN_USER.password,
    });

    localStorage.setItem("auth", JSON.stringify(loginRes.data));

    renderWithProviders();

    // Header appears when orders are loaded
    expect(await screen.findByText("All Orders")).toBeInTheDocument();

    // Product name from seeded order should appear
    expect(await screen.findByText("Test Product")).toBeInTheDocument();
    // Initial status via native select
    const select = screen.getByLabelText("status");
    expect(select).toHaveDisplayValue("Not Processed");
  });

  it("updates order status via selector", async () => {
    const loginRes = await axios.post("/api/v1/auth/login", {
      email: ADMIN_USER.email,
      password: ADMIN_USER.password,
    });

    localStorage.setItem("auth", JSON.stringify(loginRes.data));

    renderWithProviders();

    // Product name from seeded order should appear
    expect(await screen.findByText("Test Product")).toBeInTheDocument();

    const select = await screen.findByLabelText("status");

    // Change to Processing using native select
    fireEvent.change(select, { target: { value: "Processing" } });

    // After status change, component re-fetches orders and the new value should reflect
    await waitFor(() => {
      expect(screen.getByLabelText("status")).toHaveDisplayValue("Processing");
    });
  });
});
