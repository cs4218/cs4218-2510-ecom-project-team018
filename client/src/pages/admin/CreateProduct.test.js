import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import CreateProduct from "./CreateProduct";
import axios from "axios";
import toast from "react-hot-toast";

/* mocks */
jest.mock("axios");
jest.mock("react-hot-toast");

// mock photo preview
global.URL.createObjectURL = jest.fn(() => "mocked-url");

// mock components
jest.mock("../../components/Layout", () => (props) => (
  <div data-testid="Layout">{props.children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="AdminMenu" />
));

// mock navigate (page auto navigates to '/dashboard/admin/products' upon successful product creation)
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// sample data
const SAMPLE_CATEGORIES = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Books" },
];

const SHIPPING = {
  YES: "Yes",
  NO: "No",
};

const SAMPLE_INPUTS = [
  {
    category: "Electronics",
    photo: new File(["dummy content"], "test-photo.png", {
      type: "image/png",
    }),
    name: "Test Product",
    description: "Test description",
    price: "50",
    quantity: "10",
    shipping: SHIPPING.NO,
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

describe("Actions - handleCreate() function", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({
      data: { success: true, category: SAMPLE_CATEGORIES },
    });
  });

  test("submits successfully with valid data", async () => {
    axios.post.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <CreateProduct />
      </MemoryRouter>
    );

    // wait for categories to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // select category
    const selectCategory = screen.getAllByRole("combobox")[0];
    fireEvent.mouseDown(selectCategory);
    await waitFor(() => {
      SAMPLE_CATEGORIES.forEach((cat) => {
        expect(screen.getByText(cat.name)).toBeInTheDocument();
      });
    });
    fireEvent.click(screen.getByText(SAMPLE_INPUTS[0].category));

    //  picture
    const photoInput = screen.getByLabelText(/upload photo/i);
    fireEvent.change(photoInput, {
      target: { files: [SAMPLE_INPUTS[0].photo] },
    });
    // wait for photo preview to appear
    await waitFor(() => {
      expect(screen.getByAltText(/product_photo/i)).toBeInTheDocument();
    });
    // label to display the file name
    expect(screen.getByText(SAMPLE_INPUTS[0].photo.name)).toBeInTheDocument();

    // fill inputs
    fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
      target: { value: SAMPLE_INPUTS[0].name },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a description/i), {
      target: { value: SAMPLE_INPUTS[0].description },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a price/i), {
      target: { value: SAMPLE_INPUTS[0].price },
    });
    fireEvent.change(screen.getByPlaceholderText(/write a quantity/i), {
      target: { value: SAMPLE_INPUTS[0].quantity },
    });

    // select shipping
    const selectShipping = screen.getAllByRole("combobox")[1];
    fireEvent.mouseDown(selectShipping);

    const newShippingOption = await screen.findByText(
      SAMPLE_INPUTS[0].shipping
    );
    fireEvent.click(newShippingOption);

    // click 'create product' button
    fireEvent.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Product Created Successfully"
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });
  });

  test("unsuccesful submission error from API", async () => {
    axios.post.mockRejectedValueOnce(new Error("Network error"));

    render(
      <MemoryRouter>
        <CreateProduct />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });
});
