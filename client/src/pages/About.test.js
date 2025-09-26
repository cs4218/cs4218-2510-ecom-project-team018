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

    test("renders text headings", () => {
        render(<About />);
        expect(
            screen.getByRole("heading", {
                name: /we are a group of software testers from cs4218/i,
            })
        ).toBeInTheDocument();
    });
});