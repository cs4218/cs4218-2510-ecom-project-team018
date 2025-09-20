import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import CreateCategory from "./CreateCategory";
import axios from "axios";
import toast from "react-hot-toast";

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
    expect(screen.getByTestId("category-form")).toBeInTheDocument();
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

  test("categories exist", async () => {
    // check for when categories exist, the categories table renders them
    // mock get() success with 1 category
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [SAMPLE_CATEGORIES[0]] },
    });

    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(SAMPLE_CATEGORIES[0].name)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});

describe("Create Category Actions - handle submit", () => {
  test("submit form success", async () => {
    // check for successful category creation
    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "new category created" },
    });

    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    // enter new category
    const input = await screen.findByPlaceholderText(/Enter new category/i);
    fireEvent.change(input, { target: { value: SAMPLE_CATEGORIES[0].name } });
    // submit form
    const submitButton = screen.getByRole("button", { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/category/create-category",
        { name: SAMPLE_CATEGORIES[0].name }
      );
      expect(toast.success).toHaveBeenCalledWith(
        SAMPLE_CATEGORIES[0].name + " is created"
      );
    });
  });

  test("category already exists", async () => {
    // when adding new category, category already exists
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Category Already Exists" },
    });

    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    // enter new category
    const input = await screen.findByPlaceholderText(/Enter new category/i);
    fireEvent.change(input, { target: { value: SAMPLE_CATEGORIES[0].name } });
    // submit form
    const submitButton = screen.getByRole("button", { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Category Already Exists");
    });
  });

  test("error from API", async () => {
    // checks for when the handle submit API call has an error
    jest.spyOn(console, "log").mockImplementation(() => {}); // silence console.log
    axios.post.mockRejectedValueOnce(new Error("smth went wrong"));

    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    // enter new category
    const input = await screen.findByPlaceholderText(/Enter new category/i);
    fireEvent.change(input, { target: { value: "fail category" } });
    // submit form
    const submitButton = screen.getByRole("button", { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "somthing went wrong in input form"
      );
    });
  });

  // rmb to clear typos in the page file at the end
});
