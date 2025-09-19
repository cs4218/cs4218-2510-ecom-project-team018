import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Orders from './Orders';
import axios from 'axios';

jest.mock('axios');

jest.mock('../../context/auth', () => ({
  useAuth: () => [{ user: null, token: 'test-token' }, jest.fn()],
}));

jest.mock('../../context/cart', () => ({
    useCart: () => [[], jest.fn()],
}));

jest.mock('../../context/search', () => ({
    useSearch: () => [[], jest.fn()],
}))


jest.mock('../../hooks/useCategory', () => jest.fn(() => [
  { _id: "c1", name: "Electronics" },
  { _id: "c2", name: "Book" },
  { _id: "c3", name: "Clothing" }
]));

// Make moment.fromNow deterministic
jest.mock("moment", () => {
  // Always return an object with a stable fromNow()
  return () => ({
    fromNow: () => "2 days ago"
  });
});

jest.mock('react-hot-toast');

describe('Orders Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    })

    it("Only renders header, no order rows or products with no Products", async () => {
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/auth/orders") {
                return Promise.resolve(
                    { data: [] }
                )
            }
        });

        render(
            <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
                <Routes>
                    <Route path="/dashboard/user/orders" element={<Orders />} />
                </Routes>
            </MemoryRouter>
        );

        // API called
        await waitFor(() =>
            expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders")
        );

        // No order cells rendered
        expect(screen.queryByTestId("order_index")).not.toBeInTheDocument();
        expect(screen.queryByTestId("order_status")).not.toBeInTheDocument();
        expect(screen.queryByTestId("order_buyer_name")).not.toBeInTheDocument();
        expect(screen.queryByTestId("order_time")).not.toBeInTheDocument();
        expect(screen.queryByTestId("order_payment_success")).not.toBeInTheDocument();
        expect(screen.queryByTestId("order_product_length")).not.toBeInTheDocument();

        // And no product prices visible either
        expect(screen.queryByText(/Price :/i)).not.toBeInTheDocument();
    });


  it("shows correct table values and product for 1 Product", async () => {

    const oneOrder = [
        {
            status: "Processing",
            buyer: { name: "Alice" },
            createAt: "2024-01-01T00:00:00Z",
            payment: { success: true },
            products: [
                { _id: "p1", name: "Laptop", description: "Fast machine", price: 999 },
            ]
        },
    ];
    
    axios.get.mockImplementation((url) => {
        if (url === "/api/v1/auth/orders") {
            return Promise.resolve(
                { data: oneOrder }
            )
        }
    });

    render(
        <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
            <Routes>
                <Route path="/dashboard/user/orders" element={<Orders />} />
            </Routes>
        </MemoryRouter>
    );

    await waitFor(() => {
        //API Has Been Called
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
        expect(screen.getByTestId("order_index")).toHaveTextContent("1");
        expect(screen.getByTestId("order_status")).toHaveTextContent("Processing");
        expect(screen.getByTestId("order_buyer_name")).toHaveTextContent("Alice");
        expect(screen.getByTestId("order_time")).toHaveTextContent("2 days ago");
        expect(screen.getByTestId("order_payment_success")).toHaveTextContent("Success");
        expect(screen.getByTestId("order_product_length")).toHaveTextContent("1");
        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getByText("Price : 999")).toBeInTheDocument();
  });
 });


  it ("shows correct table values and products for 2 Products", async () => {

    const twoOrders = [
      {
        status: "Processing",
        buyer: { name: "Alice" },
        createAt: "2024-01-01T00:00:00Z",
        payment: { success: true },
        products: [
          { _id: "p1", name: "Laptop", description: "Fast machine", price: 999 },
          { _id: "p2", name: "Mouse", description: "Wireless mouse", price: 29 },
        ],
      },
      {
        status: "Delivered",
        buyer: { name: "Bob" },
        createAt: "2024-02-01T00:00:00Z",
        payment: { success: false },
        products: [{ _id: "p3", name: "Enid Blyton", description: "Great read", price: 19 }],
      },
    ];
    
    axios.get.mockImplementation((url) => {
        if (url === "/api/v1/auth/orders") {
            return Promise.resolve(
                { data: twoOrders }
            )
        }
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
            <Routes>
                <Route path="/dashboard/user/orders" element={<Orders />} />
            </Routes>
        </MemoryRouter>
    );

    // API Called
    await waitFor(async () => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");

        // There are 2 orders -> 2 rows worth of testids
        const indexes = await screen.findAllByTestId("order_index");
        const statuses = await screen.findAllByTestId("order_status");
        const buyers = await screen.findAllByTestId("order_buyer_name");
        const times = await screen.findAllByTestId("order_time");
        const payments = await screen.findAllByTestId("order_payment_success");
        const qtys = await screen.findAllByTestId("order_product_length");


        expect(indexes.map((n) => n.textContent)).toEqual(["1", "2"]);
        expect(statuses.map((n) => n.textContent)).toEqual(["Processing", "Delivered"]);
        expect(buyers.map((n) => n.textContent)).toEqual(["Alice", "Bob"]);
        expect(times.map((n) => n.textContent)).toEqual(["2 days ago", "2 days ago"]);
        expect(payments.map((n) => n.textContent)).toEqual(["Success", "Failed"]);
        expect(qtys.map((n) => n.textContent)).toEqual(["2", "1"]);

        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getByText("Mouse")).toBeInTheDocument();
        expect(screen.getByText("Enid Blyton")).toBeInTheDocument();
    });
  })

  it ('should catch errors for faulty Orders API and toast error', async () => {
    axios.get.mockImplementation((url) => {
        if (url === "/api/v1/auth/orders") {
            return Promise.reject(
                new Error("Orders API failed")
            )
        }
    });

    render(
        <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
            <Routes>
                <Route path="/dashboard/user/orders" element={<Orders />} />
            </Routes>
        </MemoryRouter>
    );

    // API called
    await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders")
    );

    expect(toast.error).toHaveBeenCalledWith('Orders API Went Wrong');
  })
})