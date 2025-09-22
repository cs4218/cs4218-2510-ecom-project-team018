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


const oneOrder = [
    {
        status: "Processing",
        buyer: { name: "Alice" },
        createdAt: "2024-01-01T00:00:00Z",
        payment: { success: true },
        products: [
            { _id: "p1", name: "Laptop", description: "Fast machine", price: 999 },
        ]
    },
];

const oneOrderTwoProduct = [
    {
        status: "Processing",
        buyer: { name: "Alice" },
        createdAt: "2024-01-01T00:00:00Z",
        payment: { success: true },
        products: [
            { _id: "p1", name: "Laptop", description: "Fast machine", price: 999 },
            { _id: "p2", name: "Mouse", description: "Wireless mouse", price: 29 }
        ]
    },
];

const twoOrdersOneProduct = [
    {
    status: "Processing",
    buyer: { name: "Alice" },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [
        { _id: "p1", name: "Laptop", description: "Fast machine", price: 999 },
    ],
    },
    {
    status: "Delivered",
    buyer: { name: "Bob" },
    createdAt: "2024-02-01T00:00:00Z",
    payment: { success: false },
    products: [
        { _id: "p3", name: "Enid Blyton", description: "Great read", price: 19 },
    ]
    },
];


const twoOrderstwoProduct = [
    {
    status: "Processing",
    buyer: { name: "Alice" },
    createdAt: "2024-01-01T00:00:00Z",
    payment: { success: true },
    products: [
        { _id: "p1", name: "Laptop", description: "Fast machine", price: 999 },
        { _id: "p2", name: "Mouse", description: "Wireless mouse", price: 29 },
    ],
    },
    {
    status: "Delivered",
    buyer: { name: "Bob" },
    createdAt: "2024-02-01T00:00:00Z",
    payment: { success: false },
    products: [
        { _id: "p3", name: "Enid Blyton", description: "Great read", price: 19 },
        { _id: "p4", name: "Excel Spreadsheets", description: "Great Software", price: 19 },
    ]
    },
];

const longDescription = "This description is definitely more than thirty characters long for testing."

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
                description: longDescription,
                price: 49,
            },
        ],
    },
]


describe('Orders Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    })

    it("only renders header, no order rows or Products with no Products", async () => {
        axios.get.mockResolvedValueOnce({ data: [] })

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


  it("shows correct table values and Product for 1 Order with 1 Product", async () => {
    
    axios.get.mockResolvedValueOnce({ data: oneOrder })
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
        expect(screen.getByText("Price : $999")).toBeInTheDocument();
        const img = screen.getByAltText("Laptop");
        expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
    });
  });

  it("shows correct table values and Products for 1 Order with multiple Products", async () => {
    
    axios.get.mockResolvedValueOnce({ data: oneOrderTwoProduct })

    render(
        <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
            <Routes>
                <Route path="/dashboard/user/orders" element={<Orders />} />
            </Routes>
        </MemoryRouter>
    );

    await waitFor(async () => {
        //API Has Been Called
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
        const indexes = await screen.findAllByTestId("order_index");
        const statuses = await screen.findAllByTestId("order_status");
        const buyers = await screen.findAllByTestId("order_buyer_name");
        const times = await screen.findAllByTestId("order_time");
        const payments = await screen.findAllByTestId("order_payment_success");
        const qtys = await screen.findAllByTestId("order_product_length");

        expect(indexes.map((n) => n.textContent)).toEqual(["1"]);
        expect(statuses.map((n) => n.textContent)).toEqual(["Processing"]);
        expect(buyers.map((n) => n.textContent)).toEqual(["Alice"]);
        expect(times.map((n) => n.textContent)).toEqual(["2 days ago"]);
        expect(payments.map((n) => n.textContent)).toEqual(["Success"]);
        expect(qtys.map((n) => n.textContent)).toEqual(["2"]);

        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getByText("Mouse")).toBeInTheDocument();

        const laptopImage = screen.getByAltText("Laptop");
        expect(laptopImage).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
        const mouseImage = screen.getByAltText("Mouse");
        expect(mouseImage).toHaveAttribute("src", "/api/v1/product/product-photo/p2");
    });
  });

  it("shows correct table values and Products for multiple Orders with 1 Product", async () => {
    
    axios.get.mockResolvedValueOnce({ data: twoOrdersOneProduct })

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
        expect(qtys.map((n) => n.textContent)).toEqual(["1", "1"]);

        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getByText("Enid Blyton")).toBeInTheDocument();

        const laptopImage = screen.getByAltText("Laptop");
        expect(laptopImage).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
        const enidBlytonImage = screen.getByAltText("Enid Blyton");
        expect(enidBlytonImage).toHaveAttribute("src", "/api/v1/product/product-photo/p3");
    });
  })  


  it("shows correct table values and products for multiple Orders with multiple Products", async () => {
    
    axios.get.mockResolvedValueOnce({ data: twoOrderstwoProduct })

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
        expect(qtys.map((n) => n.textContent)).toEqual(["2", "2"]);

        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getByText("Mouse")).toBeInTheDocument();
        expect(screen.getByText("Enid Blyton")).toBeInTheDocument();
        expect(screen.getByText("Excel Spreadsheets")).toBeInTheDocument();

        const laptopImage = screen.getByAltText("Laptop");
        expect(laptopImage).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
        const mouseImage = screen.getByAltText("Mouse");
        expect(mouseImage).toHaveAttribute("src", "/api/v1/product/product-photo/p2");
        const enidBlytonImage = screen.getByAltText("Enid Blyton");
        expect(enidBlytonImage).toHaveAttribute("src", "/api/v1/product/product-photo/p3");
        const excelSpreadsheetsImage = screen.getByAltText("Excel Spreadsheets");
        expect(excelSpreadsheetsImage).toHaveAttribute("src", "/api/v1/product/product-photo/p4");
    });
  })

  it("should catch errors for faulty Orders API and toast error", async () => {
    axios.get.mockRejectedValueOnce(new Error("Orders API failed"))

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

    expect(toast.error).toHaveBeenCalledWith("Error loading orders, please try again later");
  })

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
            expect(toast.error).toHaveBeenCalledWith(
                "Unable to retrieve Orders, please sign out and sign in again."
            );
            expect(axios.get).not.toHaveBeenCalledWith();
        });
    });

    it("renders full product description when description length < 30", async () => {
        axios.get.mockResolvedValueOnce({
            data: oneOrder
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
            expect(screen.getByText("Fast machine")).toBeInTheDocument();
            expect(screen.queryByText("Fast machine...")).not.toBeInTheDocument();
        })
    });

    it("renders truncated description with ... when description length ≥ 30", async () => {
        axios.get.mockResolvedValueOnce({
            data: longDescriptionOrder
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
            const expectedText = longDescription.substring(0, 30) + "...";
            expect(screen.getByText(expectedText)).toBeInTheDocument();
        })
    });
})