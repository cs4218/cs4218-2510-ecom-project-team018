import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CartProvider, useCart } from "./cart";

// to read and update CartContext
function TestConsumer() {
    const [cart, setCart] = useCart();
    return (
        <div>
            <div data-testid="count">{cart.length}</div>
            <ul aria-label="items">
                {cart.map((it) => (
                    <li key={it.id} data-testid={`item-${it.id}`}>
                        {it.name} * {it.qty}
                    </li>
                ))}
            </ul>
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
        const initial = [
            { id: 2, name: "Item B", qty: 1 },
            { id: 3, name: "Item C", qty: 3 },
        ];
        localStorage.setItem("cart", JSON.stringify(initial));
        render(
            <CartProvider>
                <TestConsumer />
            </CartProvider>
        );
        expect(screen.getByTestId("count")).toHaveTextContent("2");
        expect(screen.getByTestId("item-2")).toHaveTextContent("Item B * 1");
        expect(screen.getByTestId("item-3")).toHaveTextContent("Item C * 3");
    });

    test("defaults to empty array when localStorage has no cart", () => {
        render(
            <CartProvider>
                <TestConsumer />
            </CartProvider>
        );
        expect(screen.getByTestId("count")).toHaveTextContent("0");
        expect(screen.getByLabelText("items").children.length).toBe(0);
    });

    test("setCart updates the provided cart value", () => {
        render(
            <CartProvider>
                <TestConsumer />
            </CartProvider>
        );
        fireEvent.click(screen.getByText("add"));
        expect(screen.getByTestId("count")).toHaveTextContent("1");
        expect(screen.getByTestId("item-1")).toHaveTextContent("Item A * 2");
    });
});