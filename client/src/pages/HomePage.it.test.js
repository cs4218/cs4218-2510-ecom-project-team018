import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import HomePage from "./HomePage";
import Product from "../../../models/productModel.js";
import Category from "../../../models/categoryModel.js";
import categoryRoutes from "../../../routes/categoryRoutes.js";
import productRoutes from "../../../routes/productRoutes.js";
import { CartProvider } from "../context/cart";
import toast from "react-hot-toast";
import { act } from 'react-dom/test-utils';

import {
  clearDB,
  connectTestDB,
  disconnectTestDB,
} from "../../../tests/mongoTestEnv.js";

dotenv.config();

// Mock Layout to avoid external dependencies
jest.mock("../components/Layout", () => ({
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
let products, categories;
const TEST_PORT = 5001;

/**
 * Seed 3 categories + 7 products.
 * Insert order: P1..P7 (oldest..newest). Controller sorts DESC by createdAt/_id,
 * so initial page (size=6) returns: P7,P6,P5,P4,P3,P2. "Load More" then yields P1.
 */
const seedData = async () => {
  categories = await Category.insertMany([
    { name: "Electronics", slug: "electronics" },
    { name: "Books", slug: "books" },
    { name: "Clothing", slug: "clothing" },
  ]);

  products = await Product.insertMany([
    { name: "P1 Phone", slug: "p1-phone", description: "desc", price: 700, category: categories[0]._id, quantity: 10 },
    { name: "P2 Laptop", slug: "p2-laptop", description: "desc", price: 999, category: categories[0]._id, quantity: 10 },
    { name: "P3 Headset", slug: "p3-headset", description: "desc", price: 50,  category: categories[0]._id, quantity: 10 },
    { name: "P4 Novel",   slug: "p4-novel",  description: "desc", price: 20,  category: categories[1]._id, quantity: 10 },
    { name: "P5 Textbook",slug: "p5-textbook",description: "desc",price: 80, category: categories[1]._id, quantity: 10 },
    { name: "P6 T-Shirt", slug: "p6-tshirt", description: "desc", price: 25,  category: categories[2]._id, quantity: 10 },
    { name: "P7 Jacket",  slug: "p7-jacket", description: "desc", price: 120, category: categories[2]._id, quantity: 10 },
  ]);
};

describe("HomePage Integration Tests", () => {
  beforeAll(async () => {
    await connectTestDB();

    app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/api/v1/category", categoryRoutes);
    app.use("/api/v1/product", productRoutes);

    server = app.listen(TEST_PORT);
    axios.defaults.baseURL = `http://localhost:${TEST_PORT}`;

    await seedData();
  });

  afterAll(async () => {
    if (server) server.close();
    await clearDB();
    await disconnectTestDB();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter initialEntries={["/"]}>
        <CartProvider>
          <HomePage />
        </CartProvider>
      </MemoryRouter>
    );
  };

  it("shows page 1 products (6 newest, sorted in descending order)", async () => {
    renderPage();

    await waitFor(() => {
      const productNamesEls = screen.getAllByTestId("product-name");
      expect(productNamesEls.length).toBe(6);
    });

    const productNamesEls = screen.getAllByTestId("product-name");
    const names = productNamesEls.map((el) => el.textContent);

    expect(names).toEqual([
      products[6].name,
      products[5].name,
      products[4].name,
      products[3].name,
      products[2].name,
      products[1].name,
    ]);
  });

  it("loads and displays category checkboxes", async () => {
    renderPage();

    expect(
      await screen.findByRole("checkbox", { name: categories[0].name })
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("checkbox", { name: categories[1].name })
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("checkbox", { name: categories[2].name })
    ).toBeInTheDocument();
  });

  it("filters products by 1 selected category (Electronics)", async () => {
    renderPage();

    const electronicsCheckbox = await screen.findByRole("checkbox", {
      name: categories[0].name,
    });
    await act(async () => await userEvent.click(electronicsCheckbox));

    await waitFor(() => {
      const productNamesEls = screen.getAllByTestId("product-name");
      expect(productNamesEls.length).toBe(3);
    });

    const names = screen.getAllByTestId("product-name").map((el) => el.textContent);
    expect(names).toEqual(
      expect.arrayContaining([
        products[0].name,
        products[1].name,
        products[2].name,
      ])
    );
  });

  it("filters products by multiple selected categories (Electronics + Books)", async () => {
    renderPage();

    const electronicsCheckbox = await screen.findByRole("checkbox", {
      name: categories[0].name,
    });

    await act(async () => await userEvent.click(electronicsCheckbox));

    const booksCheckbox = await screen.findByRole("checkbox", {
      name: categories[1].name,
    });

    await act(async () => await userEvent.click(booksCheckbox));

    await waitFor(() => {
      const productNamesEls = screen.getAllByTestId("product-name");
      expect(productNamesEls.length).toBe(5);
    });

    const names = screen.getAllByTestId("product-name").map((el) => el.textContent);
    expect(names).toEqual(
      expect.arrayContaining([
        products[0].name,
        products[1].name,
        products[2].name,
        products[3].name,
        products[4].name,
      ])
    );
  });

  it("filters products by price range ($20 to $39)", async () => {
    renderPage();

    const priceOption = await screen.findByText("$20 to 39");
    await act(async () => await userEvent.click(priceOption));

    await waitFor(() => {
      const productNamesEls = screen.getAllByTestId("product-name");
      expect(productNamesEls.length).toBe(2);
    });

    const names = screen.getAllByTestId("product-name").map((el) => el.textContent);
    expect(names).toEqual(
      expect.arrayContaining([
       products[3].name,
       products[5].name,
      ])
    );
  });

  it("filters products by category and price", async () => {
    renderPage();

    const electronicsCheckbox = await screen.findByRole("checkbox", {
      name: categories[0].name,
    });
    await act(async () => await userEvent.click(electronicsCheckbox));

    const priceOption = await screen.findByText("$40 to 59");

    await act(async () => await userEvent.click(priceOption));

    await waitFor(() => {
      const productNamesEls = screen.getAllByTestId("product-name");
      expect(productNamesEls.length).toBe(1);
    });

    const names = screen.getAllByTestId("product-name").map((el) => el.textContent);
    expect(names).toEqual(expect.arrayContaining([products[2].name]));
  });

  it("returns to original products when category filter is unchecked", async () => {
    renderPage();

    const electronicsCheckbox = await screen.findByRole("checkbox", {
      name: categories[0].name,
    });
    await act(async () => userEvent.click(electronicsCheckbox));

    await waitFor(() => {
      const productNamesEls = screen.getAllByTestId("product-name");
      expect(productNamesEls.length).toBe(3);
    });

    await act(async () => userEvent.click(electronicsCheckbox));

    await waitFor(() => {
      const productNamesEls = screen.getAllByTestId("product-name");
      expect(productNamesEls.length).toBe(6);
    });
  });

  it("shows original products when RESET FILTERS button is clicked", async () => {
    renderPage();

    const electronicsCheckbox = await screen.findByRole("checkbox", {
      name: categories[0].name,
    });
    await act(async () => userEvent.click(electronicsCheckbox));

    const priceOption = await screen.findByText("$20 to 39");
    await act(async () => userEvent.click(priceOption));

    const resetButton = screen.getByText("RESET FILTERS");
    await act(async () => userEvent.click(resetButton));

    await waitFor(() => {
      const productNamesEls = screen.getAllByTestId("product-name");
      expect(productNamesEls.length).toBe(6);
    });
  });

  it("adds a product to cart successfully", async () => {
    renderPage();

    // Wait for products to load
    await screen.findAllByTestId("product-name");

    const addButtons = screen.getAllByRole("button", { name: /add to cart/i });
    await act(async () => userEvent.click(addButtons[0]));

    const storedCart = JSON.parse(localStorage.getItem("cart"));
    expect(storedCart.length).toBe(1);
    expect(storedCart[0]._id).toBe(products[6]._id.toString());

    expect(toast.success).toHaveBeenCalledWith("Item added to cart");
  });

  it("shows error when adding the same product twice", async () => {
    renderPage();

    const addButtons = await screen.findAllByRole("button", { name: /add to cart/i });

    await act(async () => userEvent.click(addButtons[0]));
    expect(toast.success).toHaveBeenCalledWith("Item added to cart");

    await act(async () => userEvent.click(addButtons[0]));

    const storedCart = JSON.parse(localStorage.getItem("cart"));
    expect(storedCart.length).toBe(1);

    expect(toast.error).toHaveBeenCalledWith("Item already in cart");
  });

  it("loads more products when 'Load More' button is clicked", async () => {
    renderPage();

    await waitFor(() => {
      const productNamesEls = screen.getAllByTestId("product-name");
      expect(productNamesEls.length).toBe(6);
    });

    const loadMoreBtn = screen.getByText(/load more/i);
    await act(async () => userEvent.click(loadMoreBtn));

    await waitFor(() => {
      const productNamesEls = screen.getAllByTestId("product-name");
      expect(productNamesEls.length).toBe(7);
    });

    const names = screen.getAllByTestId("product-name").map(el => el.textContent);
    expect(names).toContain(products[0].name);
  });

  it("navigates to product details when 'More Details' is clicked", async () => {
    renderPage();

    // Wait for products to load
    const detailsButtons = await screen.findAllByRole("button", { name: /more details/i });

    // Click the first button
    await act(async () => userEvent.click(detailsButtons[0]));

    // The first product shown is products[6] (P7 Jacket) because of DESC sorting
    expect(mockNavigate).toHaveBeenCalledWith(`/product/${products[6].slug}`);
  });

  it("shows loading state when fetching more products", async () => {
    renderPage();

    let loadMoreBtn;

    await waitFor(() => {
      loadMoreBtn = screen.getByText(/load more/i);
    });

    await act(async () => userEvent.click(loadMoreBtn));
    
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const productNamesEls = screen.getAllByTestId("product-name");
      expect(productNamesEls.length).toBe(7);
    });
  });
});
