import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Products from "./Products";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";

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

// mock navigate (page navigates when clicking on a product)
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

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

  axios.get.mockResolvedValue({ data: { products: SAMPLE_PRODUCTS } });
});

describe("Products Page", () => {
  test("successfully renders products", async () => {
    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>
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

describe("Products Page links", () => {
  test("links to correct product page", async () => {
    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>
    );

    for (const product of SAMPLE_PRODUCTS) {
      const productName = await screen.findByText(product.name);
      const link = productName.closest("a"); // find the parent <Link>
      expect(link).toHaveAttribute(
        "href",
        `/dashboard/admin/product/${product.slug}`
      );
    }
  });
});
