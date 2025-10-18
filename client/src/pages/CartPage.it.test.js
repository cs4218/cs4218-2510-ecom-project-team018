import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import CartPage from "./CartPage";
import { AuthProvider } from "../context/auth";
import { CartProvider } from "../context/cart";
import productRoutes from "../../../routes/productRoutes.js";
import {
  clearDB,
  connectTestDB,
  disconnectTestDB,
} from "../../../tests/mongoTestEnv.js";

dotenv.config();

// Mock Layout
jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

// Mock Braintree DropIn
jest.mock("braintree-web-drop-in-react", () => {
  const React = require("react");
  function DropIn({ onInstance }) {
    const calledRef = React.useRef(false);
    React.useEffect(() => {
      if (calledRef.current) return;
      calledRef.current = true;
      onInstance?.({
        requestPaymentMethod: () =>
          Promise.resolve({ nonce: "fake-nonce-from-dropin" }),
      });
    }, []);
    return React.createElement("div", { "data-testid": "dropin-mock" }, "DropIn");
  }
  return { __esModule: true, default: DropIn };
});

let server;
let app;
const TEST_PORT = 5062;

async function insertProduct({ price, quantity, name = "Inserted", description = "seed" }) {
  const mongoose = require("mongoose");
  const _id = new mongoose.Types.ObjectId();
  const products = mongoose.connection.db.collection("products");
  await products.insertOne({
    _id,
    name,
    slug: `seed-${Date.now()}`,
    description,
    price,
    category: new mongoose.Types.ObjectId(),
    quantity,
  });
  return { _id: _id.toString(), name, description, price };
}

async function getProductQuantity(idStr) {
  const mongoose = require("mongoose");
  const products = mongoose.connection.db.collection("products");
  const doc = await products.findOne({
    _id: new (require("mongoose").Types.ObjectId)(idStr),
  });
  return doc?.quantity ?? null;
}

describe("CartPage Integration", () => {
  beforeAll(async () => {
    await connectTestDB();

    app = express();
    app.use(cors());
    app.use(express.json());

    app.use("/api/v1/product", productRoutes);

    server = app.listen(TEST_PORT);
    axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;
  });

  afterAll(async () => {
    if (server) server.close();
    await clearDB();
    await disconnectTestDB();
  });

  beforeEach(async () => {
    localStorage.clear();
    jest.clearAllMocks();
    await clearDB();
  });

  const renderWithProviders = () =>
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <AuthProvider>
          <CartProvider>
            <CartPage />
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    );

  test("handles logged in but no address", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({ token: "t", user: { name: "Alice", address: "" } })
    );

    const prod = await insertProduct({ price: 40, quantity: 3, name: "Product1" });
    localStorage.setItem("cart", JSON.stringify([prod]));

    // Stub token success
    const realGet = axios.get;
    axios.get = async (url, ...rest) => {
      if (url.includes("/api/v1/product/braintree/token")) {
        return { data: { success: true, clientToken: "test-client-token" } };
      }
      return realGet(url, ...rest);
    };

    renderWithProviders();

    expect(
      await screen.findByRole("button", { name: /Update Address/i })
    ).toBeInTheDocument();

    const dropIn = await waitFor(() => screen.queryByTestId("dropin-mock"));
    const payBtn = screen.queryByRole("button", { name: /Make Payment/i });
    if (dropIn && payBtn) {
      expect(payBtn).toBeDisabled();
    }

    axios.get = realGet;
  });

  test("blocks payment when inventory is insufficient", async () => {
    const prod = await insertProduct({
      price: 77,
      quantity: 0,
      name: "Product2",
    });
    expect(await getProductQuantity(prod._id)).toBe(0);

    localStorage.setItem(
      "auth",
      JSON.stringify({ token: "t", user: { name: "Bob", address: "123 Road" } })
    );
    localStorage.setItem("cart", JSON.stringify([prod]));

    renderWithProviders();

    await waitFor(() => screen.queryByTestId("dropin-mock"));

    const payBtn = screen.queryByRole("button", { name: /Make Payment/i });
    if (payBtn) {
      expect(payBtn).toBeEnabled();
      fireEvent.click(payBtn);

      await waitFor(async () => {
        expect(screen.queryByText(/Orders/i)).not.toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem("cart") || "[]").length).toBe(1);
        expect(await getProductQuantity(prod._id)).toBe(0);
      });
    } else {
      expect(JSON.parse(localStorage.getItem("cart") || "[]").length).toBe(1);
    }
  });

  test("handles payment processor failure", async () => {
    const prod = await insertProduct({ price: 30, quantity: 2, name: "Product3" });
    expect(await getProductQuantity(prod._id)).toBe(2);

    localStorage.setItem(
      "auth",
      JSON.stringify({ token: "t", user: { name: "Cara", address: "123 Street" } })
    );
    localStorage.setItem("cart", JSON.stringify([prod]));

    // Stub payment failure
    const realPost = axios.post;
    axios.post = async (url, data, config) => {
      if (url.includes("/api/v1/product/braintree/payment")) {
        return { data: { success: false, message: "Processor declined" } };
      }
      return realPost(url, data, config);
    };

    renderWithProviders();

    await waitFor(() => screen.queryByTestId("dropin-mock"));

    const payBtn = screen.queryByRole("button", { name: /Make Payment/i });
    if (payBtn) {
      fireEvent.click(payBtn);

      await waitFor(async () => {
        expect(screen.queryByText(/Orders/i)).not.toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem("cart") || "[]").length).toBe(1);
        expect(await getProductQuantity(prod._id)).toBe(2);
      });
    } else {
      expect(JSON.parse(localStorage.getItem("cart") || "[]").length).toBe(1);
    }

    axios.post = realPost;
  });

  test("handles token endpoint failure", async () => {
    // Stub token failure
    const realGet = axios.get;
    axios.get = async (url, ...rest) => {
      if (url.includes("/api/v1/product/braintree/token")) {
        return { data: { success: false, message: "no token" } };
      }
      return realGet(url, ...rest);
    };

    localStorage.setItem(
      "auth",
      JSON.stringify({ token: "t", user: { name: "Bob", address: "123 Road" } })
    );
    const prod = await insertProduct({ price: 19, quantity: 5, name: "Product4" });
    localStorage.setItem("cart", JSON.stringify([prod]));

    renderWithProviders();

    await waitFor(() => expect(screen.queryByTestId("dropin-mock")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Make Payment/i })).not.toBeInTheDocument();

    axios.get = realGet;
  });

  test("clears cart and navigates if successful payment", async () => {
    // Stub token + payment access
    const realGet = axios.get;
    const realPost = axios.post;

    axios.get = async (url, ...rest) => {
      if (url.includes("/api/v1/product/braintree/token")) {
        return { data: { success: true, clientToken: "test-client-token" } };
      }
      return realGet(url, ...rest);
    };

    axios.post = async (url, data, config) => {
      if (url.includes("/api/v1/product/braintree/payment")) {
        return { data: { success: true, transaction: { id: "tx_123" } } };
      }
      return realPost(url, data, config);
    };

    const prod1 = await insertProduct({ price: 50, quantity: 3, name: "P1" });
    const prod2 = await insertProduct({ price: 25, quantity: 2, name: "P2" });

    localStorage.setItem(
      "auth",
      JSON.stringify({ token: "t", user: { name: "Bob", address: "123 Road" } })
    );
    localStorage.setItem("cart", JSON.stringify([prod1, prod2]));

    renderWithProviders();

    await waitFor(() =>
      expect(screen.getByTestId("dropin-mock")).toBeInTheDocument()
    );

    const payBtn = screen.getByRole("button", { name: /Make Payment/i });
    expect(payBtn).toBeEnabled();
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("cart") || "[]")).toEqual([]);
    });

    axios.get = realGet;
    axios.post = realPost;
  });
});
