import React from "react";
import axios from "axios";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route, useParams } from "react-router-dom";
import "@testing-library/jest-dom";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import CategoryProduct from "./CategoryProduct";
import {
  connectTestDB,
  clearDB,
  disconnectTestDB,
} from "../../../tests/mongoTestEnv.js";
import Category from "../../../models/categoryModel.js";
import Product from "../../../models/productModel.js";
import productRoutes from "../../../routes/productRoutes.js";
import { CartProvider } from "../context/cart";
import { DEFAULT_PAGE_SIZE } from "../../../controllers/productController.js";

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
  apparel: {
    name: "Integration Apparel",
    slug: "integration-apparel",
  },
  accessories: {
    name: "Integration Accessories",
    slug: "integration-accessories",
  },
});

const ProductRouteSpy = () => {
  const { slug } = useParams();
  return <div data-testid="navigated-product">{slug}</div>;
};

const renderWithProviders = (
  initialRoute = `/category/${CATEGORY_FIXTURES.apparel.slug}`
) =>
  render(
    <CartProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
          <Route path="/product/:slug" element={<ProductRouteSpy />} />
        </Routes>
      </MemoryRouter>
    </CartProvider>
  );

let productCounter = 0;
const createProduct = (categoryId, overrides = {}) => {
  productCounter += 1;
  const defaults = {
    name: `Integration Product ${productCounter}`,
    slug: `integration-product-${productCounter}`,
    description: `Integration product ${productCounter} description`,
    price: 100 + productCounter,
    quantity: 25,
    shipping: true,
    category: categoryId,
  };
  return Product.create({
    ...defaults,
    ...overrides,
    category: categoryId,
  });
};

describe("CategoryProduct Integration", () => {
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
    productCounter = 0;
  });

  describe("Category rendering", () => {
    it("displays category details and first page products", async () => {
      const category = await Category.create(CATEGORY_FIXTURES.apparel);

      const products = await Promise.all(
        Array.from({ length: DEFAULT_PAGE_SIZE }, (_, index) =>
          createProduct(category._id, {
            name: `Rendered Product ${index + 1}`,
            slug: `rendered-product-${index + 1}`,
          })
        )
      );

      renderWithProviders(`/category/${CATEGORY_FIXTURES.apparel.slug}`);

      const heading = await screen.findByText(
        `Category - ${CATEGORY_FIXTURES.apparel.name}`
      );
      expect(heading).toBeInTheDocument();

      expect(
        screen.getByText(new RegExp(`${products.length} results found`, "i"))
      ).toBeInTheDocument();
      products.forEach((product) => {
        expect(screen.getByText(product.name)).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/No products found in this category/i)
      ).not.toBeInTheDocument();
    });

    it("shows empty state when no products exist", async () => {
      await Category.create(CATEGORY_FIXTURES.apparel);

      renderWithProviders(`/category/${CATEGORY_FIXTURES.apparel.slug}`);

      expect(
        await screen.findByText(`Category - ${CATEGORY_FIXTURES.apparel.name}`)
      ).toBeInTheDocument();
      expect(screen.getByText(/0 results found/i)).toBeInTheDocument();
      expect(
        screen.getByText(/No products found in this category/i)
      ).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("loads additional products when Load more is clicked", async () => {
      const category = await Category.create(CATEGORY_FIXTURES.apparel);
      const totalProducts = DEFAULT_PAGE_SIZE * 2; // 2 pages

      const orderedNames = [];
      for (let i = 1; i <= totalProducts; i += 1) {
        const name = `Paged Product ${i}`;
        orderedNames.push(name);
        await createProduct(category._id, {
          name,
          slug: `paged-product-${i}`,
        });
      }

      // Products rendered in reverse order (newest first)
      renderWithProviders(`/category/${CATEGORY_FIXTURES.apparel.slug}`);

      expect(
        await screen.findByText(`Category - ${CATEGORY_FIXTURES.apparel.name}`)
      ).toBeInTheDocument();

      // First page assertions
      for (
        let i = totalProducts;
        i > totalProducts - DEFAULT_PAGE_SIZE;
        i -= 1
      ) {
        expect(screen.getByText(orderedNames[i - 1])).toBeInTheDocument();
      }
      for (let i = totalProducts - DEFAULT_PAGE_SIZE; i >= 1; i -= 1) {
        expect(screen.queryByText(orderedNames[i - 1])).not.toBeInTheDocument();
      }
      const loadMoreButton = await screen.findByRole("button", {
        name: /load more/i,
      });
      expect(loadMoreButton).toBeEnabled();

      fireEvent.click(loadMoreButton);

      // Second page assertions
      await waitForElementToBeRemoved(() => screen.queryByText(/Loading .../i));
      for (let i = 0; i < totalProducts; i++) {
        expect(screen.getByText(orderedNames[i])).toBeInTheDocument();
      }
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: /load more/i })
        ).not.toBeInTheDocument()
      );
    });
  });
});
