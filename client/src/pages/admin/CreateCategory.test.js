import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import CreateCategory from "./CreateCategory";

// mock API calls
jest.mock("axios", () => ({
  get: jest.fn().mockResolvedValue({ data: { success: true, category: [] } }),
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

jest.mock("../../components/Form/CategoryForm", () => (props) => (
  <div data-testid="CategoryForm" {...props} />
));

// test cat 1

// test cat 2

describe("Create Category Components", () => {
  test("renders common components", () => {
    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    // in the same layout order
    expect(screen.getByTestId("Layout")).toBeInTheDocument();
    expect(screen.getByTestId("AdminMenu")).toBeInTheDocument();
    expect(screen.getByText(/Manage Category/i)).toHaveTextContent(
      "Manage Category"
    ); // header
    expect(screen.getByTestId("CategoryForm")).toBeInTheDocument();
    // table headers
    expect(screen.getByText(/Name/i)).toHaveTextContent("Name");
    expect(screen.getByText(/Actions/i)).toHaveTextContent("Actions");
  });

  test("no categories exist", () => {});

  test("categories exist", () => {});

  describe("Create Category Actions", () => {});
});
