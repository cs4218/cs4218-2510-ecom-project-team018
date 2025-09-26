import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Pagenotfound from './Pagenotfound';

// Mocks
jest.mock("./../components/Layout", () => {
    return ({ title, children }) => (
        <div data-testid="layout" data-title={title}>
            {children}
        </div>
    );
});

describe("Pagenotfound", () => {
    test("passes correct title to Layout", () => {
        render(
            <MemoryRouter>
                <Pagenotfound />
            </MemoryRouter>
        );
        expect(screen.getByTestId("layout")).toHaveAttribute(
            "data-title",
            "go back- page not found"
        );
    });

    test("renders 404 and not-found heading", () => {
        render(
            <MemoryRouter>
                <Pagenotfound />
            </MemoryRouter>
        );
        expect(screen.getByText("404")).toBeInTheDocument();
        expect(screen.getByText(/Oops\s*! Page Not Found/i)).toBeInTheDocument();
    });

    test("renders 'Go Back' link pointing to home", () => {
        render(
            <MemoryRouter>
                <Pagenotfound />
            </MemoryRouter>
        );
        const link = screen.getByRole("link", { name: /go back/i });
        expect(link).toHaveAttribute("href", "/");
        expect(link).toHaveClass("pnf-btn");
    });
});