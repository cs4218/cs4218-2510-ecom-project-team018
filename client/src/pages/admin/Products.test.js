import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Products from "./Products";
import axios from "axios";
import toast from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";

/* mocks */
jest.mock("axios");
jest.mock("react-hot-toast");

// mock components
jest.mock("../../components/Layout", () => (props) => (
  <div data-testid="Layout">{props.children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="AdminMenu" />
));

// sample data
const SAMPLE_PRODUCTS = [
  {
    _id: "1",
    name: "Product 1",
    description: "Description 1",
    slug: "product-1",
  },
  {
    _id: "2",
    name: "Product 2",
    description: "Description 2",
    slug: "product-2",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Products Page", () => {
  test("successfully renders products", async () => {
    axios.get.mockResolvedValue({ data: { products: SAMPLE_PRODUCTS } });

    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );

    expect(await screen.findByTestId("Layout")).toBeInTheDocument();
    expect(screen.getByTestId("AdminMenu")).toBeInTheDocument();

    await waitFor(() => {
      SAMPLE_PRODUCTS.forEach((product) => {
        // photo
        const img = screen.getByAltText(product.name);
        expect(img).toBeInTheDocument();
        expect(img.src).toContain(
          `/api/v1/product/product-photo/${product._id}`
        );
        // name
        expect(screen.getByText(product.name)).toBeInTheDocument();
        // description
        expect(screen.getByText(product.description)).toBeInTheDocument();
      });
    });
  });
});

// test navigation
