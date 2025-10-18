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
    name: "Integration Product",
    description: "Primary integration product",
    price: 899,
  },
  firstRelated: {
    name: "Related Integration Product",
    description: "Secondary integration product",
    price: 499,
  },
  secondRelated: {
    name: "Second Related Integration Product",
    description: "Tertiary integration product",
    price: 299,
  },
  secondaryCategory: {
    name: "Secondary Category Product",
    description: "Product from another category",
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
