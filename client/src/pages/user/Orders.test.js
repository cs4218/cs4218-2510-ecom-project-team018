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
    fromNow: () => TWO_DAYS_AGO,
  });
});

jest.mock('react-hot-toast');

function paymentStatusToString( paymentStatus ) {
    if ( paymentStatus ) {
        return "Success";
    } else {
        return "Failed";
    }
}

// === Constants ===
const API_ENDPOINT = "/api/v1/auth/orders";

const MESSAGES = {
  ERROR_API: "Error loading orders, please try again later",
  ERROR_AUTH: "Unable to retrieve Orders, please sign out and sign in again.",
};

const TWO_DAYS_AGO = "2 days ago";

// === Mock Data ===
const oneOrder = [
  {
    status: "Processing",
    buyer: { name: "Alice" },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [{ _id: "p1", name: "Laptop", description: "Fast machine", price: 999 }],
  },
];

const oneOrderTwoProduct = [
  {
    status: "Processing",
    buyer: { name: "Alice" },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [{ _id: "p1", name: "Laptop", description: "Fast machine", price: 999 }, { _id: "p2", name: "Mouse", description: "Wireless mouse", price: 29 }],
  },
];

const twoOrdersOneProduct = [
  {
    status: "Processing",
    buyer: { name: "Alice" },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [{ _id: "p1", name: "Laptop", description: "Fast machine", price: 999 }],
  },
  {
    status: "Delivered",
    buyer: { name: "Bob" },
    createdAt: "2024-02-01T00:00:00Z",
    payment: { success: false },
    products: [{ _id: "p3", name: "Enid Blyton", description: "Great read", price: 19 }],
  },
];

const twoOrdersTwoProduct = [
  {
    status: "Processing",
    buyer: { name: "Alice" },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [{ _id: "p1", name: "Laptop", description: "Fast machine", price: 999 }, { _id: "p2", name: "Mouse", description: "Wireless mouse", price: 29 }],
  },
  {
    status: "Delivered",
    buyer: { name: "Bob" },
    createdAt: "2024-02-01T00:00:00Z",
    payment: { success: false },
    products: [{ _id: "p3", name: "Enid Blyton", description: "Great read", price: 19 }, { _id: "p4", name: "Excel Spreadsheets", description: "Great Software", price: 19 }],
  },
];

const longDescriptionOrder = [
  {
    status: "Processing",
    buyer: { name: "Bob" },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [
      {
        _id: "p2",
        name: "Mouse",
        description: "This description is definitely more than thirty characters long for testing.",
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
      expect(screen.getByTestId("order_index")).toHaveTextContent(oneOrder[0].products.length);
      expect(screen.getByTestId("order_status")).toHaveTextContent(oneOrder[0].status);
      expect(screen.getByTestId("order_buyer_name")).toHaveTextContent(oneOrder[0].buyer.name);
      expect(screen.getByTestId("order_time")).toHaveTextContent(TWO_DAYS_AGO);
      expect(screen.getByTestId("order_payment_success")).toHaveTextContent(paymentStatusToString(oneOrder[0].payment.success));
      expect(screen.getByTestId("order_product_length")).toHaveTextContent(oneOrder[0].products.length);
      expect(screen.getByText(oneOrder[0].products[0].name)).toBeInTheDocument();
      expect(screen.getByText(`Price : $${oneOrder[0].products[0].price}`)).toBeInTheDocument();
      const img = screen.getByAltText(oneOrder[0].products[0].name);
      expect(img).toHaveAttribute("src", `/api/v1/product/product-photo/${oneOrder[0].products[0]._id}`);
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

      expect(statuses.map((n) => n.textContent)).toEqual([oneOrderTwoProduct[0].status]);
      expect(buyers.map((n) => n.textContent)).toEqual([oneOrderTwoProduct[0].buyer.name]);
      expect(times.map((n) => n.textContent)).toEqual([TWO_DAYS_AGO]);
      expect(payments.map((n) => n.textContent)).toEqual([paymentStatusToString(oneOrderTwoProduct[0].payment.success)]);
      expect(qtys.map((n) => n.textContent)).toEqual([String(oneOrderTwoProduct[0].products.length)]);

      expect(screen.getByText(oneOrderTwoProduct[0].products[0].name)).toBeInTheDocument();
      expect(screen.getByText(oneOrderTwoProduct[0].products[1].name)).toBeInTheDocument();

      const laptopImg = screen.getByAltText(oneOrderTwoProduct[0].products[0].name);
      expect(laptopImg).toHaveAttribute("src", `/api/v1/product/product-photo/${oneOrderTwoProduct[0].products[0]._id}`);

      const mouseImg = screen.getByAltText(oneOrderTwoProduct[0].products[1].name);
      expect(mouseImg).toHaveAttribute("src", `/api/v1/product/product-photo/${oneOrderTwoProduct[0].products[1]._id}`);
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

      expect(statuses.map((n) => n.textContent)).toEqual([twoOrdersOneProduct[0].status, twoOrdersOneProduct[1].status]);
      expect(buyers.map((n) => n.textContent)).toEqual([twoOrdersOneProduct[0].buyer.name, twoOrdersOneProduct[1].buyer.name]);
      expect(times.map((n) => n.textContent)).toEqual([TWO_DAYS_AGO, TWO_DAYS_AGO]);
      expect(payments.map((n) => n.textContent)).toEqual([paymentStatusToString(twoOrdersOneProduct[0].payment.success), paymentStatusToString(twoOrdersOneProduct[1].payment.success)]);
      expect(qtys.map((n) => n.textContent)).toEqual([String(twoOrdersOneProduct[0].products.length), String(twoOrdersOneProduct[1].products.length)]);

      expect(screen.getByText(twoOrdersOneProduct[0].products[0].name)).toBeInTheDocument();
      expect(screen.getByText(twoOrdersOneProduct[1].products[0].name)).toBeInTheDocument();

      const laptopImg = screen.getByAltText(twoOrdersOneProduct[0].products[0].name);
      expect(laptopImg).toHaveAttribute("src", `/api/v1/product/product-photo/${twoOrdersOneProduct[0].products[0]._id}`);

      const bookImg = screen.getByAltText(twoOrdersOneProduct[1].products[0].name);
      expect(bookImg).toHaveAttribute("src", `/api/v1/product/product-photo/${twoOrdersOneProduct[1].products[0]._id}`);
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

      expect(statuses.map((n) => n.textContent)).toEqual([twoOrdersTwoProduct[0].status, twoOrdersTwoProduct[1].status]);
      expect(buyers.map((n) => n.textContent)).toEqual([twoOrdersTwoProduct[0].buyer.name, twoOrdersTwoProduct[1].buyer.name]);
      expect(times.map((n) => n.textContent)).toEqual([TWO_DAYS_AGO, TWO_DAYS_AGO]);
      expect(payments.map((n) => n.textContent)).toEqual([paymentStatusToString(twoOrdersTwoProduct[0].payment.success), paymentStatusToString(twoOrdersTwoProduct[1].payment.success)]);
      expect(qtys.map((n) => n.textContent)).toEqual([String(twoOrdersTwoProduct[0].products.length), String(twoOrdersTwoProduct[1].products.length)]);

      expect(screen.getByText(twoOrdersTwoProduct[0].products[0].name)).toBeInTheDocument();
      expect(screen.getByText(twoOrdersTwoProduct[0].products[1].name)).toBeInTheDocument();
      expect(screen.getByText(twoOrdersTwoProduct[1].products[0].name)).toBeInTheDocument();
      expect(screen.getByText(twoOrdersTwoProduct[1].products[1].name)).toBeInTheDocument();

      const laptopImg = screen.getByAltText(twoOrdersTwoProduct[0].products[0].name);
      expect(laptopImg).toHaveAttribute("src", `/api/v1/product/product-photo/${twoOrdersTwoProduct[0].products[0]._id}`);

      const mouseImg = screen.getByAltText(twoOrdersTwoProduct[0].products[1].name);
      expect(mouseImg).toHaveAttribute("src", `/api/v1/product/product-photo/${twoOrdersTwoProduct[0].products[1]._id}`);

      const bookImg = screen.getByAltText(twoOrdersTwoProduct[1].products[0].name);
      expect(bookImg).toHaveAttribute("src", `/api/v1/product/product-photo/${twoOrdersTwoProduct[1].products[0]._id}`);

      const excelImg = screen.getByAltText(twoOrdersTwoProduct[1].products[1].name);
      expect(excelImg).toHaveAttribute("src", `/api/v1/product/product-photo/${twoOrdersTwoProduct[1].products[1]._id}`);
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
      expect(screen.getByText(oneOrder[0].products[0].description)).toBeInTheDocument();
      expect(screen.queryByText(`${oneOrder[0].products[0].description}...`)).not.toBeInTheDocument();
    });
  });

  it("renders truncated description with ellipsis when description length ≥ 30", async () => {
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
      const expectedText = longDescriptionOrder[0].products[0].description.substring(0, 30) + "...";
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });
});
