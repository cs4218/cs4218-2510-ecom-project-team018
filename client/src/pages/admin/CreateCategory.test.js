import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import CreateCategory from "./CreateCategory";
import axios from "axios";

// mock API calls
jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// mock components
jest.mock("../../components/Layout", () => (props) => (
  <div data-testid="Layout">{props.children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="AdminMenu" />
));

jest.mock("../../components/Form/CategoryForm", () => () => (
  <div data-testid="CategoryForm" />
));

// sample categories
const SAMPLE_CATEGORIES = [
  {
    _id: "cat1",
    name: "Electronics",
    slug: "electronics",
  },
  {
    _id: "cat2",
    name: "Books",
    slug: "books",
  },
];

describe("Create Category Components", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({
      data: { success: true, category: [] },
    });
  });

  test("renders common components", async () => {
    // check if the common components are rendered correctly
    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    // in the same layout order
    expect(await screen.findByTestId("Layout")).toBeInTheDocument();
    expect(screen.getByTestId("AdminMenu")).toBeInTheDocument();
    expect(screen.getByText(/Manage Category/i)).toHaveTextContent(
      "Manage Category"
    ); // header
    expect(screen.getByTestId("CategoryForm")).toBeInTheDocument();
    // table headers
    expect(screen.getByText(/Name/i)).toHaveTextContent("Name");
    expect(screen.getByText(/Actions/i)).toHaveTextContent("Actions");
  });

  test("no categories exist", async () => {
    // check for when there are no existing categories, the categories table is rendered empty
    // by default mocked with no categories
    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    await waitFor(() => {
      for (const cat of SAMPLE_CATEGORIES) {
        expect(screen.queryByText(cat.name)).not.toBeInTheDocument();
      }
    });
  });
});

describe("Create Category Actions", () => {});
