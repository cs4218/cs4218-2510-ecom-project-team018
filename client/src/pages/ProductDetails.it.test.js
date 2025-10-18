import React from "react";
import axios from "axios";
import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  fireEvent,
  within,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ProductDetails from "./ProductDetails";
import {
  connectTestDB,
  clearDB,
  disconnectTestDB,
} from "../../../tests/mongoTestEnv.js";
import Category from "../../../models/categoryModel.js";
import Product from "../../../models/productModel.js";
import productRoutes from "../../../routes/productRoutes.js";
import { CartProvider } from "../context/cart";

dotenv.config();

jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout-mock">{children}</div>,
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const toast = jest.requireMock("react-hot-toast").default;

const CATEGORY_FIXTURES = Object.freeze({
  primary: {
    name: "Integration Category",
    slug: "integration-category",
  },
  secondary: {
    name: "Secondary Category",
    slug: "secondary-category",
  },
});

const PRODUCT_TEMPLATES = Object.freeze({
  main: {
    name: "Main Integration Product name",
    description: "Main integration product description",
    price: 899,
  },
  firstRelated: {
    name: "First Related Integration Product name",
    description: "First related integration product description",
    price: 499,
  },
  secondRelated: {
    name: "Second Related Integration Product name",
    description: "Second related integration product description",
    price: 299,
  },
  secondaryCategory: {
    name: "Secondary Category Product name",
    description: "Product from another category description",
    price: 39,
  },
});

const renderWithProviders = (initialRoute) =>
  render(
    <CartProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    </CartProvider>
  );

let counter = 0;
const createProduct = (categoryId, overrides = {}) =>
  Product.create({
    name: "Sample Product",
    slug: `sample-product-${counter++}`,
    description: "Sample product description",
    price: 199,
    quantity: 10,
    shipping: true,
    category: categoryId,
    ...overrides,
  });

describe("ProductDetails Integration", () => {
  let app;
  let server;

  beforeAll(async () => {
    await connectTestDB();

    app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/api/v1/product", productRoutes);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        axios.defaults.baseURL = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await clearDB();
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDB();
    localStorage.clear();
    toast.success.mockClear();
    toast.error.mockClear();
  });

  it("renders product details and similar products from the API", async () => {
    const primaryCategory = await Category.create(CATEGORY_FIXTURES.primary);

    const mainProduct = await createProduct(
      primaryCategory._id,
      PRODUCT_TEMPLATES.main
    );
    const firstRelatedProduct = await createProduct(
      primaryCategory._id,
      PRODUCT_TEMPLATES.firstRelated
    );
    const secondRelatedProduct = await createProduct(
      primaryCategory._id,
      PRODUCT_TEMPLATES.secondRelated
    );

    const secondaryCategory = await Category.create(
      CATEGORY_FIXTURES.secondary
    );
    await createProduct(
      secondaryCategory._id,
      PRODUCT_TEMPLATES.secondaryCategory
    );

    renderWithProviders(`/product/${mainProduct.slug}`);

    expect(screen.getByText(/Loading product details/i)).toBeInTheDocument();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Loading product details/i)
    );

    // Verify main product details
    expect(
      await screen.findByRole("heading", { name: /Product Details/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(PRODUCT_TEMPLATES.main.name))
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(PRODUCT_TEMPLATES.main.description))
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(PRODUCT_TEMPLATES.main.price))
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(CATEGORY_FIXTURES.primary.name))
    ).toBeInTheDocument();

    const mainImg = screen.getByAltText(PRODUCT_TEMPLATES.main.name);
    expect(mainImg).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${mainProduct._id}`
    );

    // Verify similar products section
    const similarSection = await screen.findByTestId("similar-products");
    expect(similarSection).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByText(/No similar products found/i)
      ).not.toBeInTheDocument()
    );

    const cards = await screen.findAllByTestId(/^similar-product-/);
    expect(cards).toHaveLength(2);

    // Verify first related product card
    const firstRelatedCard = await screen.findByTestId(
      `similar-product-${firstRelatedProduct._id.toString()}`
    );
    expect(
      within(firstRelatedCard).getByText(
        new RegExp(PRODUCT_TEMPLATES.firstRelated.name)
      )
    ).toBeInTheDocument();
    expect(
      within(firstRelatedCard).getByText(
        new RegExp(PRODUCT_TEMPLATES.firstRelated.price)
      )
    ).toBeInTheDocument();

    // Verify second related product card
    const secondRelatedCard = await screen.findByTestId(
      `similar-product-${secondRelatedProduct._id.toString()}`
    );
    expect(
      within(secondRelatedCard).getByText(
        new RegExp(PRODUCT_TEMPLATES.secondRelated.name)
      )
    ).toBeInTheDocument();
    expect(
      within(secondRelatedCard).getByText(
        new RegExp(PRODUCT_TEMPLATES.secondRelated.price)
      )
    ).toBeInTheDocument();

    // Ensure product from secondary category is not shown
    expect(
      screen.queryByText(PRODUCT_TEMPLATES.secondaryCategory.name)
    ).not.toBeInTheDocument();
  });

  it("navigates to another product when selecting a similar product", async () => {
    const category = await Category.create(CATEGORY_FIXTURES.primary);

    const mainProduct = await createProduct(
      category._id,
      PRODUCT_TEMPLATES.main
    );
    const relatedProduct = await createProduct(
      category._id,
      PRODUCT_TEMPLATES.firstRelated
    );

    renderWithProviders(`/product/${mainProduct.slug}`);

    // Wait for main product to load
    expect(screen.getByText(/Loading product details/i)).toBeInTheDocument();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Loading product details/i)
    );

    // Click on the related product's "More Details" button
    const relatedProductCard = await screen.findByTestId(
      `similar-product-${relatedProduct._id.toString()}`
    );
    fireEvent.click(
      within(relatedProductCard).getByRole("button", { name: /more details/i })
    );

    // Wait for the new product details to load
    expect(screen.getByText(/Loading product details/i)).toBeInTheDocument();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Loading product details/i)
    );

    // Verify that the main product details are now for the related product
    await screen.findByText(new RegExp(PRODUCT_TEMPLATES.firstRelated.name));
    expect(
      screen.getByText(new RegExp(PRODUCT_TEMPLATES.firstRelated.description))
    ).toBeInTheDocument();

    const originalCard = await screen.findByTestId(
      `similar-product-${mainProduct._id.toString()}`
    );
    expect(
      within(originalCard).getByText(new RegExp(PRODUCT_TEMPLATES.main.name))
    ).toBeInTheDocument();
  });

  it("adds the main product to cart and persists it locally, and prevents duplicates", async () => {
    const category = await Category.create(CATEGORY_FIXTURES.primary);

    const mainProduct = await createProduct(
      category._id,
      PRODUCT_TEMPLATES.main
    );

    renderWithProviders(`/product/${mainProduct.slug}`);

    expect(screen.getByText(/Loading product details/i)).toBeInTheDocument();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Loading product details/i)
    );

    // Add to Cart
    const addToCartButton = await screen.findByRole("button", {
      name: /add to cart/i,
    });
    fireEvent.click(addToCartButton);

    // Verify localStorage update
    await waitFor(() => expect(localStorage.getItem("cart")).toBeTruthy());
    let storedCart = JSON.parse(localStorage.getItem("cart"));
    expect(storedCart).toHaveLength(1);
    expect(storedCart[0]._id).toBe(mainProduct._id.toString());
    expect(toast.success).toHaveBeenCalledWith("Item added to cart");

    // Try adding the same product again
    fireEvent.click(addToCartButton);
    storedCart = JSON.parse(localStorage.getItem("cart"));
    expect(storedCart).toHaveLength(1);
    expect(toast.error).toHaveBeenCalledWith("Item already in cart");
  });

  it("adds similar product to cart when its button is clicked", async () => {
    const category = await Category.create(CATEGORY_FIXTURES.primary);

    const mainProduct = await createProduct(
      category._id,
      PRODUCT_TEMPLATES.main
    );
    const relatedProduct = await createProduct(
      category._id,
      PRODUCT_TEMPLATES.firstRelated
    );

    renderWithProviders(`/product/${mainProduct.slug}`);
    expect(screen.getByText(/Loading product details/i)).toBeInTheDocument();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Loading product details/i)
    );

    const relatedProductCard = await screen.findByTestId(
      `similar-product-${relatedProduct._id.toString()}`
    );
    const addToCartButton = within(relatedProductCard).getByRole("button", {
      name: /add to cart/i,
    });
    fireEvent.click(addToCartButton);

    // Verify localStorage update
    await waitFor(() => expect(localStorage.getItem("cart")).toBeTruthy());
    const storedCart = JSON.parse(localStorage.getItem("cart"));
    expect(storedCart).toHaveLength(1);
    expect(storedCart[0]._id).toBe(relatedProduct._id.toString());
    expect(toast.success).toHaveBeenCalledWith("Item added to cart");
  });

  it("renders not found message when the product is missing", async () => {
    renderWithProviders("/product/non-existent-product");

    expect(
      await screen.findByText(/No Such Product Found\./i)
    ).toBeInTheDocument();
  });

  it("shows no similar products message when none exist", async () => {
    const category = await Category.create(CATEGORY_FIXTURES.primary);
    const onlyProduct = await createProduct(
      category._id,
      PRODUCT_TEMPLATES.main
    );

    renderWithProviders(`/product/${onlyProduct.slug}`);

    expect(screen.getByText(/Loading product details/i)).toBeInTheDocument();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Loading product details/i)
    );

    const section = await screen.findByTestId("similar-products");
    expect(
      within(section).getByText(/No similar products found/i)
    ).toBeInTheDocument();

    const img = screen.getByAltText(PRODUCT_TEMPLATES.main.name);
    expect(img).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${onlyProduct._id}`
    );
  });

  it("does not truncate similar product descriptions of length 59", async () => {
    const category = await Category.create(CATEGORY_FIXTURES.primary);
    const mainProduct = await createProduct(
      category._id,
      PRODUCT_TEMPLATES.main
    );
    const originalLength = 59;
    const shortDescription = "x".repeat(originalLength);
    const relatedProduct = await createProduct(category._id, {
      ...PRODUCT_TEMPLATES.firstRelated,
      description: shortDescription,
    });

    renderWithProviders(`/product/${mainProduct.slug}`);
    expect(screen.getByText(/Loading product details/i)).toBeInTheDocument();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Loading product details/i)
    );

    const relCard = await screen.findByTestId(
      `similar-product-${relatedProduct._id.toString()}`
    );
    const text = within(relCard).getByText(/x+/).textContent;
    expect(text).toBe(shortDescription);
    expect(text.length).toBe(originalLength);
  });

  it("does not truncate similar product descriptions of length 60", async () => {
    const category = await Category.create(CATEGORY_FIXTURES.primary);
    const mainProduct = await createProduct(
      category._id,
      PRODUCT_TEMPLATES.main
    );
    const originalLength = 60;
    const exactDescription = "x".repeat(originalLength);
    const relatedProduct = await createProduct(category._id, {
      ...PRODUCT_TEMPLATES.firstRelated,
      description: exactDescription,
    });

    renderWithProviders(`/product/${mainProduct.slug}`);

    expect(screen.getByText(/Loading product details/i)).toBeInTheDocument();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Loading product details/i)
    );

    const relCard = await screen.findByTestId(
      `similar-product-${relatedProduct._id.toString()}`
    );
    const text = within(relCard).getByText(/x+/).textContent;

    expect(text).toBe(exactDescription);
    expect(text.length).toBe(originalLength);
  });

  it("truncates similar product descriptions of length 61", async () => {
    const category = await Category.create(CATEGORY_FIXTURES.primary);
    const mainProduct = await createProduct(
      category._id,
      PRODUCT_TEMPLATES.main
    );
    const originalLength = 61;
    const longDescription = "x".repeat(originalLength);
    const relatedProduct = await createProduct(category._id, {
      ...PRODUCT_TEMPLATES.firstRelated,
      description: longDescription,
    });
    const expectedTruncatedLength = 63; // 60 chars + "..."

    renderWithProviders(`/product/${mainProduct.slug}`);

    expect(screen.getByText(/Loading product details/i)).toBeInTheDocument();
    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Loading product details/i)
    );

    const relCard = await screen.findByTestId(
      `similar-product-${relatedProduct._id.toString()}`
    );
    const text = within(relCard).getByText(/x+/).textContent;

    expect(text.endsWith("...")).toBe(true);
    expect(text.length).toBeLessThanOrEqual(expectedTruncatedLength);
  });
});
