import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Categories from './Categories';

// Mocks
jest.mock("../components/Layout", () => {
    return ({ title, children }) => (
        <div data-testid="layout" data-title={title}>
            {children}
        </div>
    );
});
jest.mock("../hooks/useCategory", () => jest.fn(() => [
    { _id: "1", name: "Books", slug: "books" },
    { _id: "2", name: "Electronics", slug: "electronics" },
]));

const renderWithRouter = (ui) =>
    render(
        <MemoryRouter>
            {ui}
        </MemoryRouter>
    );

describe("Categories", () => {
    test("passes correct title to Layout", () => {
        renderWithRouter(<Categories />);
        expect(screen.getByTestId("layout")).toHaveAttribute(
            "data-title",
            "All Categories"
        );
    });

    test("renders a link for each category with correct text and href", () => {
        renderWithRouter(<Categories />);
        const links = screen.getAllByRole("link");
        expect(links).toHaveLength(2);
        expect(links[0]).toHaveTextContent("Books");
        expect(links[0]).toHaveAttribute("href", "/category/books");
        expect(links[0]).toHaveClass("btn", "btn-primary");
        expect(links[1]).toHaveTextContent("Electronics");
        expect(links[1]).toHaveAttribute("href", "/category/electronics");
        expect(links[1]).toHaveClass("btn", "btn-primary");
    });

    test("renders no links when hook returns empty array", () => {
        const useCategory = require("../hooks/useCategory");
        useCategory.mockReturnValueOnce([]);
        const { container } = renderWithRouter(<Categories />);
        expect(container.querySelectorAll("a").length).toBe(0);
        expect(screen.getByTestId("layout")).toBeInTheDocument();
    });
});