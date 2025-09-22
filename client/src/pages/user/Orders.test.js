import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from "../../context/auth";
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Orders from './Orders';
import axios from 'axios';

jest.mock('axios');

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [{ user: null, token: "test-token" }, jest.fn()]),
}));

jest.mock('../../context/cart', () => ({
  useCart: () => [[], jest.fn()],
}));

jest.mock('../../context/search', () => ({
  useSearch: () => [[], jest.fn()],
}));

jest.mock('../../hooks/useCategory', () => jest.fn(() => [
  { _id: "c1", name: "Electronics" },
  { _id: "c2", name: "Book" },
  { _id: "c3", name: "Clothing" }
]));

// Make moment.fromNow deterministic
jest.mock("moment", () => {
  return () => ({
    fromNow: () => TIME.TWO_DAYS_AGO,
  });
});

jest.mock('react-hot-toast');

// === Constants ===
const API_ENDPOINT = "/api/v1/auth/orders";

const STATUS = {
  PROCESSING: "Processing",
  DELIVERED: "Delivered",
  NOT_PROCESSED: "Not Process",
};

const PAYMENT = {
  SUCCESS: "Success",
  FAILED: "Failed",
};

const BUYERS = {
  ALICE: "Alice",
  BOB: "Bob",
};

const MESSAGES = {
  ERROR_API: "Error loading orders, please try again later",
  ERROR_AUTH: "Unable to retrieve Orders, please sign out and sign in again.",
};

const TIME = {
  TWO_DAYS_AGO: "2 days ago",
};

const PRODUCTS = {
  LAPTOP: { _id: "p1", name: "Laptop", description: "Fast machine", price: 999 },
  MOUSE: { _id: "p2", name: "Mouse", description: "Wireless mouse", price: 29 },
  BOOK: { _id: "p3", name: "Enid Blyton", description: "Great read", price: 19 },
  EXCEL: { _id: "p4", name: "Excel Spreadsheets", description: "Great Software", price: 19 },
};

const LONG_DESCRIPTION = "This description is definitely more than thirty characters long for testing.";

// === Mock Data ===
const oneOrder = [
  {
    status: STATUS.PROCESSING,
    buyer: { name: BUYERS.ALICE },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [PRODUCTS.LAPTOP],
  },
];

const oneOrderTwoProduct = [
  {
    status: STATUS.PROCESSING,
    buyer: { name: BUYERS.ALICE },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [PRODUCTS.LAPTOP, PRODUCTS.MOUSE],
  },
];

const twoOrdersOneProduct = [
  {
    status: STATUS.PROCESSING,
    buyer: { name: BUYERS.ALICE },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [PRODUCTS.LAPTOP],
  },
  {
    status: STATUS.DELIVERED,
    buyer: { name: BUYERS.BOB },
    createdAt: "2024-02-01T00:00:00Z",
    payment: { success: false },
    products: [PRODUCTS.BOOK],
  },
];

const twoOrdersTwoProduct = [
  {
    status: STATUS.PROCESSING,
    buyer: { name: BUYERS.ALICE },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [PRODUCTS.LAPTOP, PRODUCTS.MOUSE],
  },
  {
    status: STATUS.DELIVERED,
    buyer: { name: BUYERS.BOB },
    createdAt: "2024-02-01T00:00:00Z",
    payment: { success: false },
    products: [PRODUCTS.BOOK, PRODUCTS.EXCEL],
  },
];

const longDescriptionOrder = [
  {
    status: STATUS.PROCESSING,
    buyer: { name: BUYERS.BOB },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [
      {
        _id: PRODUCTS.MOUSE._id,
        name: PRODUCTS.MOUSE.name,
        description: LONG_DESCRIPTION,
        price: 49,
      },
    ],
  },
];

// === Tests ===
describe('Orders Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("only renders header, no order rows or Products with no Products", async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
        <Routes>
          <Route path="/dashboard/user/orders" element={<Orders />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(API_ENDPOINT)
    );

    expect(screen.queryByTestId("order_index")).not.toBeInTheDocument();
    expect(screen.queryByTestId("order_status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("order_buyer_name")).not.toBeInTheDocument();
    expect(screen.queryByTestId("order_time")).not.toBeInTheDocument();
    expect(screen.queryByTestId("order_payment_success")).not.toBeInTheDocument();
    expect(screen.queryByTestId("order_product_length")).not.toBeInTheDocument();
    expect(screen.queryByText(/Price :/i)).not.toBeInTheDocument();
  });

  it("shows correct table values and Product for 1 Order with 1 Product", async () => {
    axios.get.mockResolvedValueOnce({ data: oneOrder });

    render(
      <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
        <Routes>
          <Route path="/dashboard/user/orders" element={<Orders />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(API_ENDPOINT);
      expect(screen.getByTestId("order_index")).toHaveTextContent("1");
      expect(screen.getByTestId("order_status")).toHaveTextContent(STATUS.PROCESSING);
      expect(screen.getByTestId("order_buyer_name")).toHaveTextContent(BUYERS.ALICE);
      expect(screen.getByTestId("order_time")).toHaveTextContent(TIME.TWO_DAYS_AGO);
      expect(screen.getByTestId("order_payment_success")).toHaveTextContent(PAYMENT.SUCCESS);
      expect(screen.getByTestId("order_product_length")).toHaveTextContent("1");
      expect(screen.getByText(PRODUCTS.LAPTOP.name)).toBeInTheDocument();
      expect(screen.getByText(`Price : $${PRODUCTS.LAPTOP.price}`)).toBeInTheDocument();
      const img = screen.getByAltText(PRODUCTS.LAPTOP.name);
      expect(img).toHaveAttribute("src", `/api/v1/product/product-photo/${PRODUCTS.LAPTOP._id}`);
    });
  });

  it("shows correct table values and Products for 1 Order with multiple Products", async () => {
    axios.get.mockResolvedValueOnce({ data: oneOrderTwoProduct });

    render(
      <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
        <Routes>
          <Route path="/dashboard/user/orders" element={<Orders />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(async () => {
      expect(axios.get).toHaveBeenCalledWith(API_ENDPOINT);
      const statuses = await screen.findAllByTestId("order_status");
      const buyers = await screen.findAllByTestId("order_buyer_name");
      const times = await screen.findAllByTestId("order_time");
      const payments = await screen.findAllByTestId("order_payment_success");
      const qtys = await screen.findAllByTestId("order_product_length");

      expect(statuses.map((n) => n.textContent)).toEqual([STATUS.PROCESSING]);
      expect(buyers.map((n) => n.textContent)).toEqual([BUYERS.ALICE]);
      expect(times.map((n) => n.textContent)).toEqual([TIME.TWO_DAYS_AGO]);
      expect(payments.map((n) => n.textContent)).toEqual([PAYMENT.SUCCESS]);
      expect(qtys.map((n) => n.textContent)).toEqual(["2"]);

      expect(screen.getByText(PRODUCTS.LAPTOP.name)).toBeInTheDocument();
      expect(screen.getByText(PRODUCTS.MOUSE.name)).toBeInTheDocument();
    });
  });

  it("shows correct table values and Products for multiple Orders with 1 Product", async () => {
    axios.get.mockResolvedValueOnce({ data: twoOrdersOneProduct });

    render(
      <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
        <Routes>
          <Route path="/dashboard/user/orders" element={<Orders />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(async () => {
      expect(axios.get).toHaveBeenCalledWith(API_ENDPOINT);

      const statuses = await screen.findAllByTestId("order_status");
      const buyers = await screen.findAllByTestId("order_buyer_name");
      const times = await screen.findAllByTestId("order_time");
      const payments = await screen.findAllByTestId("order_payment_success");
      const qtys = await screen.findAllByTestId("order_product_length");

      expect(statuses.map((n) => n.textContent)).toEqual([STATUS.PROCESSING, STATUS.DELIVERED]);
      expect(buyers.map((n) => n.textContent)).toEqual([BUYERS.ALICE, BUYERS.BOB]);
      expect(times.map((n) => n.textContent)).toEqual([TIME.TWO_DAYS_AGO, TIME.TWO_DAYS_AGO]);
      expect(payments.map((n) => n.textContent)).toEqual([PAYMENT.SUCCESS, PAYMENT.FAILED]);
      expect(qtys.map((n) => n.textContent)).toEqual(["1", "1"]);

      expect(screen.getByText(PRODUCTS.LAPTOP.name)).toBeInTheDocument();
      expect(screen.getByText(PRODUCTS.BOOK.name)).toBeInTheDocument();
    });
  });

  it("shows correct table values and products for multiple Orders with multiple Products", async () => {
    axios.get.mockResolvedValueOnce({ data: twoOrdersTwoProduct });

    render(
      <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
        <Routes>
          <Route path="/dashboard/user/orders" element={<Orders />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(async () => {
      expect(axios.get).toHaveBeenCalledWith(API_ENDPOINT);

      const statuses = await screen.findAllByTestId("order_status");
      const buyers = await screen.findAllByTestId("order_buyer_name");
      const times = await screen.findAllByTestId("order_time");
      const payments = await screen.findAllByTestId("order_payment_success");
      const qtys = await screen.findAllByTestId("order_product_length");

      expect(statuses.map((n) => n.textContent)).toEqual([STATUS.PROCESSING, STATUS.DELIVERED]);
      expect(buyers.map((n) => n.textContent)).toEqual([BUYERS.ALICE, BUYERS.BOB]);
      expect(times.map((n) => n.textContent)).toEqual([TIME.TWO_DAYS_AGO, TIME.TWO_DAYS_AGO]);
      expect(payments.map((n) => n.textContent)).toEqual([PAYMENT.SUCCESS, PAYMENT.FAILED]);
      expect(qtys.map((n) => n.textContent)).toEqual(["2", "2"]);

      expect(screen.getByText(PRODUCTS.LAPTOP.name)).toBeInTheDocument();
      expect(screen.getByText(PRODUCTS.MOUSE.name)).toBeInTheDocument();
      expect(screen.getByText(PRODUCTS.BOOK.name)).toBeInTheDocument();
      expect(screen.getByText(PRODUCTS.EXCEL.name)).toBeInTheDocument();
    });
  });

  it("should catch errors for faulty Orders API and toast error", async () => {
    axios.get.mockRejectedValueOnce(new Error("Orders API failed"));

    render(
      <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
        <Routes>
          <Route path="/dashboard/user/orders" element={<Orders />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(API_ENDPOINT)
    );

    expect(toast.error).toHaveBeenCalledWith(MESSAGES.ERROR_API);
  });

  it("shows toast error when auth token is missing and does not call API", async () => {
    useAuth.mockImplementationOnce(() => [null, jest.fn()]);

    render(
      <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
        <Routes>
          <Route path="/dashboard/user/orders" element={<Orders />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(MESSAGES.ERROR_AUTH);
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  it("renders full product description when description length < 30", async () => {
    axios.get.mockResolvedValueOnce({
      data: oneOrder,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
        <Routes>
          <Route path="/dashboard/user/orders" element={<Orders />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    await waitFor(() => {
      expect(screen.getByText(PRODUCTS.LAPTOP.description)).toBeInTheDocument();
      expect(screen.queryByText(`${PRODUCTS.LAPTOP.description}...`)).not.toBeInTheDocument();
    });
  });

  it("renders truncated description with ... when description length ≥ 30", async () => {
    axios.get.mockResolvedValueOnce({
      data: longDescriptionOrder,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
        <Routes>
          <Route path="/dashboard/user/orders" element={<Orders />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    await waitFor(() => {
      const expectedText = LONG_DESCRIPTION.substring(0, 30) + "...";
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });
});
