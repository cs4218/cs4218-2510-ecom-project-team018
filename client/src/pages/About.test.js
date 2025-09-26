import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import About from './About';

// Mocks
jest.mock("./../components/Layout", () => {
    return ({ title, children }) => (
        <div data-testid="layout" data-title={title}>
            {children}
        </div>
    );
});

describe("About", () => {
    test("passes correct title to Layout", () => {
        render(<About />);
        const layout = screen.getByTestId("layout");
        expect(layout).toHaveAttribute("data-title", "About us - Ecommerce app");
    });

    test("renders image with correct src nd alt", () => {
        render(<About />);
        const img = screen.getByAltText(/contactus/i);
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute("src", "/images/about.jpeg");
        expect(img).toHaveStyle({ width: "100%" });
    });

    test("renders text and expected layout columns", () => {
        const { container } = render(<About />);
        const row = container.querySelector(".row.contactus");
        const col6 = container.querySelector(".col-md-6");
        const col4 = container.querySelector(".col-md-4");
        expect(screen.getByText(/Add text/i)).toBeInTheDocument();
        expect(row).toBeInTheDocument();
        expect(col6).toBeInTheDocument();
        expect(col4).toBeInTheDocument();
    });
});