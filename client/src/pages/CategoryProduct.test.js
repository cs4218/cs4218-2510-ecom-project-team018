// CategoryProduct.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import CategoryProduct from "./CategoryProduct";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/cart";

jest.mock("axios");

jest.mock("../components/Layout", () => {
  return ({ children }) => <div data-testid="layout">{children}</div>;
});

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useParams: jest.fn(),
    useNavigate: jest.fn(),
  };
});

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

jest.mock("../utils/productUtils", () => ({
  formatPrice: (n) => `$${Number(n).toFixed(2)}`,
  getImageUrl: (id) => `/img/${id}`,
  addToCart: jest.fn(),
  handleImgError: jest.fn(),
}));
