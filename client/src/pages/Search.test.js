import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useSearch } from '../context/search';
import '@testing-library/jest-dom/extend-expect';
import Search from './Search';
import { describe } from 'node:test';

jest.mock('axios');

const mockSetValues = jest.fn();

jest.mock("../context/search", () => ({
  useSearch: jest.fn(),
}));

jest.mock("../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

describe('Search Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders 1 product from mocked search results", async () => {
        useSearch.mockReturnValue([
            {
            results: [
                { _id: "p1", name: "Laptop", description: "A laptop", price: 999 },
            ],
            },
            mockSetValues,
        ]);

        const { findByText } = render(
            <MemoryRouter initialEntries={["/search"]}>
                <Routes>
                    <Route path="/search" element={<Search />} />
                </Routes>
            </MemoryRouter>
        );

        expect(await findByText("Laptop")).toBeInTheDocument();
        expect(await findByText(/\$ 999/)).toBeInTheDocument();
    });

    it("renders 2 products from mocked search results", async () => {
        useSearch.mockReturnValue([
            {
            results: [
                { _id: "p1", name: "Laptop", description: "A laptop", price: 999 },
                { _id: "p2", name: "Tablet", description: "A new tablet", price: 299 },
            ],
            },
            mockSetValues,
        ]);

        const { findByText } = render(
            <MemoryRouter initialEntries={["/search"]}>
                <Routes>
                    <Route path="/search" element={<Search />} />
                </Routes>
            </MemoryRouter>
        );

        // check individual product names
        expect(await findByText("Laptop")).toBeInTheDocument();
        expect(await findByText("Tablet")).toBeInTheDocument();
    });



    it("shows 'No Products Found' when there are no search results", async () => {
        useSearch.mockReturnValue([
            { results: [] },
            mockSetValues,
        ]);

        const { findByText } = render(
            <MemoryRouter initialEntries={["/search"]}>
            <Routes>
                <Route path="/search" element={<Search />} />
            </Routes>
            </MemoryRouter>
        );

        expect(await findByText("No Products Found")).toBeInTheDocument();
    });

});
