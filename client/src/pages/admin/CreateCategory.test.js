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

beforeAll(() => {
  // silence console.log to have clean test outputs
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  // restore after all tests
  console.log.mockRestore();
});

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
});

describe("Create Category Actions - get all categories", () => {
  test("get all categories successfully", async () => {
    // checks if all (>1) categories are retrieved successfully
    // load in the 2 sample categories
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: SAMPLE_CATEGORIES },
    });

    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(SAMPLE_CATEGORIES[0].name)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(SAMPLE_CATEGORIES[1].name)
    ).toBeInTheDocument();
  });

  test("error from API", async () => {
    axios.get.mockRejectedValueOnce(new Error("smth went wrong"));

    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong in getting catgeory"
      );
    });
  });
});

describe("Create Category Actions - update category", () => {
  test("update a category successfully", async () => {
    // checks if an existing category can be updated (renamed) successfully
    // load in 1 sample category
    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [SAMPLE_CATEGORIES[0]] },
      }) // initial get
      .mockResolvedValueOnce({
        data: {
          success: true,
          category: [
            { ...SAMPLE_CATEGORIES[0], name: SAMPLE_CATEGORIES[1].name },
          ],
        },
      }); // after update; keep all prev details except name

    axios.put.mockResolvedValueOnce({
      data: { success: true, message: "category updated successfully" },
    });

    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    // ensure existing category is loaded properly
    const existingCategoryName = await screen.findByText(
      SAMPLE_CATEGORIES[0].name
    );
    expect(existingCategoryName).toBeInTheDocument();

    /* update the existing category's name*/
    // click 'edit' button
    const editButton = screen.getByRole("button", { name: /Edit/i });
    fireEvent.click(editButton);
    // key in new category name
    const updatedCategoryName = SAMPLE_CATEGORIES[1].name;
    const input = await screen.findByDisplayValue(SAMPLE_CATEGORIES[0].name);
    fireEvent.change(input, { target: { value: updatedCategoryName } });
    // click 'submit' button
    const modal = screen.getByRole("dialog"); // modal
    const submitButton = within(modal).getByRole("button", { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        SAMPLE_CATEGORIES[1].name + " is updated"
      );
      expect(screen.getByText(SAMPLE_CATEGORIES[1].name)).toBeInTheDocument();
    });
  });

  test("unsuccessfully update a category", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [SAMPLE_CATEGORIES[0]] },
    });

    axios.put.mockResolvedValueOnce({
      data: { success: false, message: "Error while updating category" },
    });

    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    /* update the existing category's name*/
    // click 'edit' button
    const editButton = await screen.findByRole("button", { name: /edit/i });
    fireEvent.click(editButton);
    // key in new category name
    const updatedCategoryName = SAMPLE_CATEGORIES[1].name;
    const input = await screen.findByDisplayValue(SAMPLE_CATEGORIES[0].name);
    fireEvent.change(input, { target: { value: updatedCategoryName } });
    // click 'submit' button
    const modal = screen.getByRole("dialog"); // modal
    const submitButton = within(modal).getByRole("button", { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Error while updating category");
    });
  });

  test("error in API", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [SAMPLE_CATEGORIES[0]] },
    });

    axios.put.mockRejectedValueOnce(new Error("Network error"));

    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

    /* update the existing category's name*/
    // click 'edit' button
    const editButton = await screen.findByRole("button", { name: /edit/i });
    fireEvent.click(editButton);
    // key in new category name
    const updatedCategoryName = SAMPLE_CATEGORIES[1].name;
    const input = await screen.findByDisplayValue(SAMPLE_CATEGORIES[0].name);
    fireEvent.change(input, { target: { value: updatedCategoryName } });
    // click 'submit' button
    const modal = screen.getByRole("dialog"); // modal
    const submitButton = within(modal).getByRole("button", { name: /Submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });
});

// rmb to clear typos in the page file at the end
