import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@testing-library/jest-dom";
import UpdateProduct from "./UpdateProduct";
import axios from "axios";
import toast from "react-hot-toast";

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
const SAMPLE_CATEGORIES = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Books" },
];

const SHIPPING = {
  YES: "Yes",
  NO: "No",
};

const SAMPLE_PRODUCT = [
  {
    product: {
      _id: "123",
      name: "Test Product",
      description: "Test Description",
      price: 99,
      quantity: 10,
      shipping: SHIPPING.NO,
      category: { _id: "1" },
    },
  },
];

beforeEach(() => {
  // check with url bc the page uses get() twice
  axios.get.mockImplementation((url) => {
    if (url.includes("/get-product/")) {
      return Promise.resolve({ data: SAMPLE_PRODUCT[0] });
    }
    if (url.includes("/get-category")) {
      return Promise.resolve({ data: SAMPLE_CATEGORIES });
    }
  });

  jest.clearAllMocks();
});

describe("Update Product page components", () => {
  test("renders components and prepopulates fields with fetched product data", async () => {
    // the page loads an existing product's information into the fields
    // this test checks for if: 1. the components are there;
    // and 2. the fields are populated correctly (from the getSingleProduct() function);
    render(
      <MemoryRouter initialEntries={["/dashboard/admin/product/test-slug"]}>
        <Routes>
          <Route
            path="/dashboard/admin/product/:slug"
            element={<UpdateProduct />}
          />
        </Routes>
      </MemoryRouter>
    );

    // expect components to be rendered with placeholders filled
    await waitFor(() => {
      expect(screen.getByTestId("Layout")).toBeInTheDocument();
      expect(screen.getByTestId("AdminMenu")).toBeInTheDocument();

      // heading
      expect(
        screen.getByRole("heading", { name: /update product/i })
      ).toBeInTheDocument();
      /* fields */
      expect(
        screen.getByText(SAMPLE_PRODUCT[0].product.category._id)
      ).toBeInTheDocument(); // category
      expect(screen.getByAltText("product_photo")).toHaveAttribute(
        "src",
        `/api/v1/product/product-photo/${SAMPLE_PRODUCT[0].product._id}`
      ); // photo preview
      expect(screen.getByPlaceholderText(/write a name/i)).toHaveValue(
        SAMPLE_PRODUCT[0].product.name
      ); // name
      expect(screen.getByPlaceholderText(/write a description/i)).toHaveValue(
        SAMPLE_PRODUCT[0].product.description
      ); // description
      expect(screen.getByPlaceholderText(/write a Price/i)).toHaveValue(
        SAMPLE_PRODUCT[0].product.price
      ); // price
      expect(screen.getByPlaceholderText(/write a quantity/i)).toHaveValue(
        SAMPLE_PRODUCT[0].product.quantity
      ); // quantity
      expect(
        screen.getByText(SAMPLE_PRODUCT[0].product.shipping)
      ).toBeInTheDocument(); // shipping

      // buttons
      expect(
        screen.getByRole("button", { name: /update product/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /delete product/i })
      ).toBeInTheDocument();
    });
  });
});
