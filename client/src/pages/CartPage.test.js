import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import userEvent from "@testing-library/user-event";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";
import CartPage from './CartPage';

// Mocks
jest.mock("../components/Layout", () => ({ children }) => (
    <div data-testid="layout">{children}</div>
));
jest.mock("../context/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../context/cart", () => ({ useCart: jest.fn() }));
jest.mock("axios");
jest.mock("react-hot-toast", () => ({ success: jest.fn() }));
jest.mock("braintree-web-drop-in-react", () => {
    const React = require("react");
    return function DropInMock({ onInstance }) {
        React.useEffect(() => {
            const mockInstance = {
                requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: "nonce_abc" }),
            };
            setTimeout(() => onInstance?.(mockInstance), 0);
        }, [onInstance]);
        return <div data-testid="dropin" />;
    };
});
jest.mock("react-router-dom", () => {
    const actual = jest.requireActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => global.__mockNavigate,
    };
});


const renderWithRouter = (ui) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

const mockSetAuth = jest.fn();
const mockSetCart = jest.fn();
const mockNavigate = jest.fn();
const initialCart = [
    { _id: "p1", name: "Item One", description: "Desc 1", price: 10 },
    { _id: "p2", name: "Item Two", description: "Desc 2", price: 5.5 },
];

beforeEach(() => {
    jest.clearAllMocks();

    global.__mockNavigate = mockNavigate;

    useAuth.mockReturnValue([
        { token: "tok", user: { name: "Alice", address: "123 Test" } },
        mockSetAuth,
    ]);
    useCart.mockReturnValue([initialCart, mockSetCart]);
    axios.get.mockResolvedValue({ data: { clientToken: "client_tok_123" }});
    axios.post.mockResolvedValue({ data: { ok: true }});

    localStorage.clear();
});

describe("CartPage", () => {
    test("renders greeting with user name and cart item count", async () => {
        renderWithRouter(<CartPage />);
        expect(screen.getByText(/Hello\s+Alice/i)).toBeInTheDocument();
        expect(screen.getByText(/You Have 2 items in your cart/i)).toBeInTheDocument();
        await waitFor(() =>
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token")
        );
    });

    test("computes and displays total price", async () => {
        renderWithRouter(<CartPage />);
        await waitFor(() => expect(axios.get).toHaveBeenCalled());
        expect(screen.getByText(/Total :/)).toHaveTextContent("$15.50");
    });

    test("handles getToken failure", async () => {
        // Spy on console to silence error logs in testing
        const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        axios.get.mockRejectedValueOnce(new Error("mock error"));
        renderWithRouter(<CartPage />);
        await waitFor(() => expect(axios.get).toHaveBeenCalled());
        expect(logSpy).toHaveBeenCalledWith(expect.any(Error));
        expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();

        logSpy.mockRestore();
    });

    test("removes item from cart when clicking Remove", async () => {
        renderWithRouter(<CartPage />);
        const removeButtons = await screen.findAllByRole("button", { name: /remove/i, });
        await userEvent.click(removeButtons[0]);
        const newCart = mockSetCart.mock.calls[0][0];
        const stored = JSON.parse(localStorage.getItem("cart"));
        expect(mockSetCart).toHaveBeenCalledTimes(1);
        expect(Array.isArray(newCart)).toBe(true);
        expect(newCart.find((p) => p._id === "p1")).toBeUndefined();
        expect(stored.find((p) => p._id === "p1")).toBeUndefined();
    });

    test("shows DropIn and enables Make Payment when token, address, and cart exist", async () => {
        renderWithRouter(<CartPage />);
        await waitFor(() =>
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token")
        );
        await screen.findByTestId("dropin");
        const payBtn = await screen.findByRole("button", { name: /make payment/i });
        await waitFor(() => expect(payBtn).toBeEnabled());
    });

    test("clears cart, navigates to orders, and toasts after successful payment", async () => {
        renderWithRouter(<CartPage />);
        await screen.findByTestId("dropin");
        const payBtn = await screen.findByRole("button", { name: /make payment/i });
        await waitFor(() => expect(payBtn).toBeEnabled());
        await act(async () => {
            await userEvent.click(payBtn);
        });

        await waitFor(() =>
            expect(axios.post).toHaveBeenCalledWith("/api/v1/product/braintree/payment", {
                nonce: "nonce_abc",
                cart: initialCart,
            })
        );

        await waitFor(() => {
            expect(mockSetCart).toHaveBeenCalledWith([]);
            expect(localStorage.getItem("cart")).toBeNull();
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
            expect(toast.success).toHaveBeenCalled();
        });
    });

    test("navigates to profile when Update Address is clicked (address provided)", async () => {
        useAuth.mockReturnValueOnce([{ token: "tok", user: { name: "Alice", address: "123 Test" }}, mockSetAuth]);
        renderWithRouter(<CartPage />);
        const btn = await screen.findByRole("button", { name: /Update Address/i });
        await userEvent.click(btn);
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
    });

    test("navigates to profile when Update Address is clicked (no address)", async () => {
        useAuth.mockReturnValueOnce([{ token: "tok", user: { name: "Alice", address: "" }}, mockSetAuth]);
        renderWithRouter(<CartPage />);
        const btn = await screen.findByRole("button", { name: /Update Address/i });
        await userEvent.click(btn);
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
    });

    test("navigate to /login when unauthenticated", async () => {
        useAuth.mockReturnValueOnce([{ token: null, user: null }, mockSetAuth]);
        renderWithRouter(<CartPage />);
        const btn = await screen.findByRole("button", { name: /Please Login to checkout/i });
        await userEvent.click(btn);
        expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
    });
});
