import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import CreateProduct from "./CreateProduct";
import axios from "axios";
import toast from "react-hot-toast";

// mocks
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

beforeEach(() => {
  // mock 'getAllCategory' as the page calls it everytime upon load
  axios.get.mockResolvedValue({ data: { success: true, category: [] } });

  jest.clearAllMocks();
});

describe("Create Product page components", () => {
  test("components are rendered successfully", async () => {
    render(
      <MemoryRouter>
        <CreateProduct />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("Layout")).toBeInTheDocument();
    expect(screen.getByTestId("AdminMenu")).toBeInTheDocument();

    // heading
    expect(
      screen.getByRole("heading", { name: /create product/i })
    ).toBeInTheDocument();

    /* fields */
    expect(screen.getByText(/select a category/i)).toBeInTheDocument();
    // upload label
    expect(screen.getByText(/upload photo/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/write a description/i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/write a price/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/write a quantity/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/select shipping/i)).toBeInTheDocument();
    // button
    expect(
      screen.getByRole("button", { name: /create product/i })
    ).toBeInTheDocument();
  });
});

describe("Actions - getAllCategory() function", () => {
  test("loads categories and displays them in the 'select a category' field", async () => {
    // checks if the getAllCategory() function retrieves all (>1) the categories successfully
    // and correctly displays them in the 'select a category' field for the new product to-be-created to be under that category
    axios.get.mockResolvedValue({
      data: {
        success: true,
        category: SAMPLE_CATEGORIES,
      },
    });

    render(
      <MemoryRouter>
        <CreateProduct />
      </MemoryRouter>
    );

    // wait for useEffect to populate categories
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // find the 'select category' combobox
    const selectCategory = screen.getAllByRole("combobox")[0];
    // open the dropdown
    fireEvent.mouseDown(selectCategory);

    await waitFor(() => {
      SAMPLE_CATEGORIES.forEach((cat) => {
        expect(screen.getByText(cat.name)).toBeInTheDocument();
      });
    });
  });
});
