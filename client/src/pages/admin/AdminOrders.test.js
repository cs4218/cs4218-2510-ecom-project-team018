import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminOrders from "./AdminOrders";
import axios from "axios";
import { useAuth } from "../../context/auth";

/* mocks */
jest.mock("axios");
// mock useAuth => return a token
jest.mock("../../context/auth", () => ({
  useAuth: () => [{ token: "fake-token" }, jest.fn()],
}));

// mock components
jest.mock("../../components/Layout", () => (props) => (
  <div data-testid="Layout">{props.children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="AdminMenu" />
));

// sample data
const SAMPLE_ORDERS = [
  {
    _id: "order1",
    status: "Processing",
    buyer: { name: "LeBron James" },
    createAt: new Date().toISOString(),
    payment: { success: true },
    products: [
      {
        _id: "p1",
        name: "Product 1",
        description: "1st product description",
        price: 10,
      },
    ],
  },
  {
    _id: "order2",
    status: "Shipped",
    buyer: { name: "LeGoat James" },
    createAt: new Date().toISOString(),
    payment: { success: false },
    products: [
      {
        _id: "p2",
        name: "Product 2",
        description: "2nd product description",
        price: 20,
      },
      {
        _id: "p3",
        name: "Product 3",
        description: "3rd product description",
        price: 30,
      },
    ],
  },
];

beforeEach(() => {
  jest.clearAllMocks();

  axios.get.mockResolvedValue({ data: SAMPLE_ORDERS });
});

describe("Admin Orders components", () => {
  test("renders multiple orders correctly", async () => {
    // check if getAllOrders retrieve all (>1) orders and loads them in the page
    render(<AdminOrders />);

    // wait for orders to load
    await waitFor(() => {
      expect(screen.getByText(SAMPLE_ORDERS[0].buyer.name)).toBeInTheDocument();
      expect(screen.getByText(SAMPLE_ORDERS[1].buyer.name)).toBeInTheDocument();
    });

    // components
    expect(screen.getByTestId("Layout")).toBeInTheDocument();
    expect(screen.getByTestId("AdminMenu")).toBeInTheDocument();

    // date (both showing)
    expect(screen.getAllByText(/a few seconds ago/i)).toHaveLength(
      SAMPLE_ORDERS.length
    );

    SAMPLE_ORDERS.forEach((order) => {
      // status
      expect(screen.getByText(order.status)).toBeInTheDocument();
      // buyer name
      expect(screen.getByText(order.buyer.name)).toBeInTheDocument();
      // payment
      const paymentText = order.payment.success ? "Success" : "Failed";
      expect(screen.getByText(paymentText)).toBeInTheDocument();

      // products
      order.products.forEach((p) => {
        expect(screen.getByText(p.name)).toBeInTheDocument();
        expect(screen.getByText(p.description)).toBeInTheDocument();
        expect(screen.getByText(`Price : ${p.price}`)).toBeInTheDocument();
      });
    });
  });
});

describe("Admin Orders actions - handleChange", () => {
  test("successfully updates a product's status", async () => {
    axios.put.mockResolvedValue({ data: { success: true } });

    render(<AdminOrders />);

    // wait for orders to load
    await waitFor(() => {
      expect(screen.getByText(SAMPLE_ORDERS[0].buyer.name)).toBeInTheDocument();
      expect(screen.getByText(SAMPLE_ORDERS[1].buyer.name)).toBeInTheDocument();
    });

    // find the 'status' dropdown
    const selectStatus = screen.getAllByRole("combobox")[0];
    // open the dropdown
    fireEvent.mouseDown(selectStatus);

    // change status
    const option = screen.getByText("Delivered");
    fireEvent.click(option);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        `/api/v1/auth/order-status/${SAMPLE_ORDERS[0]._id}`,
        { status: "Delivered" }
      );
    });
  });
});
