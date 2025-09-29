import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CartProvider, useCart } from "./cart";

// to read and update CartContext
function TestConsumer() {
    const [cart, setCart] = useCart();
    return (
        <div>
            <div data-testid="cart">{JSON.stringify(cart)}</div>
            <button
                onClick={() => setCart([{ id: 1, name: "Item A", qty: 2 }])}
            >
                add
            </button>
        </div>
    );
}

describe("Cart", () => {
    beforeEach(() => {
        localStorage.clear();
        cleanup();
    });

    test("initializes cart state from localStorage", () => {
        const initial = [{ id: 2, name: "Item B", qty: 1 }];
        localStorage.setItem("cart", JSON.stringify(initial));
        render(
            <CartProvider>
                <TestConsumer />
            </CartProvider>
        );
        expect(screen.getByTestId("cart")).toHaveTextContent(JSON.stringify(initial));
    });

    test("defaults to empty array when localStorage has no cart", () => {
        render(
            <CartProvider>
                <TestConsumer />
            </CartProvider>
        );
        expect(screen.getByTestId("cart")).toHaveTextContent("[]");
    });

    test("setCart updates the provided cart value", () => {
        render(
            <CartProvider>
                <TestConsumer />
            </CartProvider>
        );
        fireEvent.click(screen.getByText("add"));
        expect(screen.getByTestId("cart")).toHaveTextContent(
            JSON.stringify([{ id: 1, name: "Item A", qty: 2 }])
        );
    });
});