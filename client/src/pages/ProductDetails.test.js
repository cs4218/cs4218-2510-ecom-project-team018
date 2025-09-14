import React from "react";
import axios from "axios";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProductDetails from "./ProductDetails";

jest.mock("axios");
jest.mock("../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));
jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));
jest.mock("../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));
jest.mock("../hooks/useCategory", () => jest.fn(() => []));
jest.spyOn(console, "error").mockImplementation(() => {});

describe("ProductDetails Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render 'No Such Product Found' when product does not exist", async () => {
    axios.get.mockRejectedValue({ response: { status: 404 } });
    render(
      <MemoryRouter initialEntries={["/product/non-existent-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/No Such Product Found./i)
    ).toBeInTheDocument();
  });

  it("should render product details correctly if product exists", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/get-product/test-product") {
        return Promise.resolve({
          data: {
            product: {
              _id: "123",
              name: "Test Product",
              description: "This is a test product",
              price: 100,
              category: { _id: "cat1", name: "Test Category" },
              slug: "test-product",
            },
          },
        });
      } else if (url.startsWith("/api/v1/product/related-product")) {
        return Promise.resolve({ data: { products: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Test Product/)).toBeInTheDocument();
    expect(
      await screen.findByText(/This is a test product/)
    ).toBeInTheDocument();
    expect(await screen.findByText(/\$100.00/)).toBeInTheDocument();
    expect(await screen.findByText(/Test Category/)).toBeInTheDocument();
  });

  it("should render similar products details correctly when available", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/get-product/test-product") {
        return Promise.resolve({
          data: {
            product: {
              _id: "123",
              name: "Test Product",
              description: "This is a test product",
              price: 100,
              category: { _id: "cat1", name: "Test Category" },
              slug: "test-product",
            },
          },
        });
      } else if (url.startsWith("/api/v1/product/related-product")) {
        return Promise.resolve({
          data: {
            products: [
              {
                _id: "456",
                name: "Similar Product 1",
                description: "This is a similar product 1",
                price: 50,
                slug: "similar-product-1",
              },
              {
                _id: "789",
                name: "Similar Product 2",
                description: "This is a similar product 2",
                price: 75,
                slug: "similar-product-2",
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Similar Product 1/)).toBeInTheDocument();
    expect(
      await screen.findByText(/This is a similar product 1/)
    ).toBeInTheDocument();
    expect(await screen.findByText(/\$50.00/)).toBeInTheDocument();

    expect(await screen.findByText(/Similar Product 2/)).toBeInTheDocument();
    expect(
      await screen.findByText(/This is a similar product 2/)
    ).toBeInTheDocument();
    expect(await screen.findByText(/\$75.00/)).toBeInTheDocument();
  });
});
