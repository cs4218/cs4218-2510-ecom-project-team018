import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Orders from "./Orders";
import Product from "../../../../models/productModel.js";
import Category from "../../../../models/categoryModel.js";
import Order from "../../../../models/orderModel.js";
import authRoutes from "../../../../routes/authRoute.js";
import { AuthProvider } from "../../context/auth";
import { MemoryRouter } from "react-router-dom";
import toast from "react-hot-toast";

import {
    clearDB, connectTestDB, disconnectTestDB
} from "../../../../tests/mongoTestEnv.js";

dotenv.config();

// Mock Layout to avoid external dependencies
jest.mock("../../components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

let server;
let app;
const TEST_PORT = 5001;

const setUpAuth = async () => {
  await axios.post("/api/v1/auth/register", {
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
    phone: "1234567890",
    address: "123 Test St",
    answer: "blue"
  });

  const loginRes = await axios.post("/api/v1/auth/login", {
    email: "test@example.com",
    password: "Password123!",
  });

  localStorage.setItem("auth", JSON.stringify(loginRes.data));

  return loginRes.data.user;
};

const createOrdersForUser = async (userId) => {
  const categories = await Category.insertMany([
    { name: "Electronics", slug: "electronics" },
    { name: "Books", slug: "books" },
  ]);

  const products = await Product.insertMany([
    { name: "P1 Phone", slug: "p1-phone", description: "This is the P1 Phone with many features. Only available in Singapore.", price: 700, category: categories[0]._id, quantity: 10 },
    { name: "NUS Textbook", slug: "nus-textbook", description: "NUS textbook that contains all knowledge required to pass NUS Degree", price: 19, category: categories[1]._id, quantity: 10 },
  ]);

  const orders = await Order.insertMany([
    {
      products: [products[0]._id],
      payment: { success: true },
      buyer: userId,
      status: "Not Processed",
    },
    {
      products: [products[1]._id],
      payment: { success: false },
      buyer: userId,
      status: "Processing",
    },
  ]);

  return { products, orders };
};

describe("Orders Page Integration Tests", () => {
    let user, orders, products;
    beforeAll(async () => {
        await connectTestDB();

        app = express();
        app.use(cors());
        app.use(express.json());
        app.use("/api/v1/auth", authRoutes);
        server = app.listen(TEST_PORT);
        axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;
    });

    beforeEach(async () => {
        await clearDB();
        localStorage.removeItem("auth");
        user = await setUpAuth();
        ({ products, orders } = await createOrdersForUser(user._id));
    })

    afterAll(async () => {
        if (server) server.close();
        await disconnectTestDB();
    })

    const renderPage = () => {
        return render(
            <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
                <AuthProvider>
                    <Orders />
                </AuthProvider>
            </MemoryRouter>
        );
    };

    it("loads orders successfully when authenticated", async () => {
        renderPage();

        const statusCells = await screen.findAllByTestId("order_status");
        const statuses = statusCells.map((cell) => cell.textContent);

        expect(statuses).toEqual(["Not Processed", "Processing"]);

        const buyerCells = await screen.findAllByTestId("order_buyer_name");
        expect(buyerCells[0].textContent).toBe(user.name);
        expect(buyerCells[1].textContent).toBe(user.name);

        const orderRows = screen.getAllByTestId("order_index");
        expect(orderRows.length).toBe(2);        
    });

    it("shows toast error if no auth token is present", async () => {
        localStorage.removeItem("auth"); // ensure no token
        renderPage();

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
            "Unable to retrieve Orders, please sign out and sign in again."
            );
        });
    });

    it("displays correct status, payment, buyer name, product count, and index", async () => {
        renderPage();

        const indexCells = await screen.findAllByTestId("order_index");
        const statusCells = screen.getAllByTestId("order_status");
        const buyerCells = screen.getAllByTestId("order_buyer_name");
        const paymentCells = screen.getAllByTestId("order_payment_success");
        const quantityCells = screen.getAllByTestId("order_product_length");

        // Order indices start at 1
        expect(indexCells[0].textContent).toBe("1");
        expect(indexCells[1].textContent).toBe("2");

        // Status matches seeded data
        expect(statusCells[0].textContent).toBe(orders[0].status);
        expect(statusCells[1].textContent).toBe(orders[1].status);

        // Buyer name should appear in both
        expect(buyerCells[0].textContent).toBe(user.name);
        expect(buyerCells[1].textContent).toBe(user.name);

        // Payment success display
        expect(paymentCells[0].textContent).toBe(orders[0].payment.success ? "Success" : "Failed");
        expect(paymentCells[1].textContent).toBe(orders[1].payment.success ? "Success" : "Failed");

        // Each order has 1 product
        expect(quantityCells[0].textContent).toBe(String(orders[0].products.length));
        expect(quantityCells[1].textContent).toBe(String(orders[1].products.length));
    });

    it("renders product details for each order (name, truncated description, price, image)", async () => {
        renderPage();

        // First order's product
        expect(await screen.findByText(products[0].name)).toBeInTheDocument();
        // Second order's product
        expect(await screen.findByText(products[1].name)).toBeInTheDocument();

        // check truncated description (first 30 chars) for each product
        const descP1 = screen.getByText((text) =>
            text.includes(products[0].description.slice(0, 30))
        );
        expect(descP1).toBeInTheDocument();

        const descP2 = screen.getByText((text) =>
            text.includes(products[1].description.slice(0, 30))
        );
        expect(descP2).toBeInTheDocument();

        // check price formatting
        expect(
            screen.getByText(`Price : $${products[0].price}`)
        ).toBeInTheDocument();
        expect(
            screen.getByText(`Price : $${products[1].price}`)
        ).toBeInTheDocument();

        // check product images render correct src for both products
        const imgs = screen.getAllByRole("img");

        // img[0] → P1
        expect(imgs[0]).toHaveAttribute(
            "src",
            `/api/v1/product/product-photo/${products[0]._id.toString()}`
        );

        // img[1] → P2
        expect(imgs[1]).toHaveAttribute(
            "src",
            `/api/v1/product/product-photo/${products[1]._id.toString()}`
        );
    });

    it("shows no orders when the user has none", async () => {
        await Order.deleteMany({});

        renderPage();

        await waitFor(() => {
            expect(screen.queryByTestId("order_index")).not.toBeInTheDocument();
        });
    });
    
    it("shows toast error when API fails", async () => {
        jest.spyOn(axios, "get").mockRejectedValueOnce(new Error("Server error"));

        renderPage();

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
            "Error loading orders, please try again later"
            );
        });
    })
});

