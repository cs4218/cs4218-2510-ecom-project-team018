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

// mock components
jest.mock("../../components/Layout", () => (props) => (
  <div data-testid="Layout">{props.children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="AdminMenu" />
));

beforeEach(() => {
  // mock 'getAllCategory' as the page calls it everytime upon load
  axios.get.mockResolvedValue({ data: { success: true, category: [] } });
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
