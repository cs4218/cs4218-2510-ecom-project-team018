import React from 'react';
import { render,  waitFor, screen } from '@testing-library/react';
import toast from "react-hot-toast";
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import HomePage from './HomePage';

// Mocking axios.post
jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../hooks/useCategory', () => jest.fn(() => [
  { _id: "c1", name: "Electronics" },
  { _id: "c2", name: "Book" },
  { _id: "c3", name: "Clothing" }
]));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [[], jest.fn()])
}));

jest.mock('../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
  }));  

jest.mock("../components/Prices", () => ({
  Prices: [
    {
      _id: 0,
      name: "$0 to 19",
      array: [0, 19],
    },
    {
      _id: 1,
      name: "$20 to 39",
      array: [20, 39],
    },
    {
      _id: 2,
      name: "$40 to 59",
      array: [40, 59],
    },
    {
      _id: 3,
      name: "$60 to 79",
      array: [60, 79],
    },
    {
      _id: 4,
      name: "$80 to 99",
      array: [80, 99],
    },
    {
      _id: 5,
      name: "$100 or more",
      array: [100, 9999],
    }
  ],
}));

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe('HomePage Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({
                    data: { success: true, category: [
                        { _id: "c1", name: "Electronics" },
                        { _id: "c2", name: "Book" },
                        { _id: "c3", name: "Clothing" }
                    ]}
                });
            } else if (url.startsWith("/api/v1/product/product-list/")) {
                return Promise.resolve({
                    data: { products: [
                        { _id: "p1", name: "Laptop", description: "A powerful laptop", price: 999, category: { name: "Electronics" }, slug: "Testing123" },
                        { _id: "p2", name: "Book Interesting", description: "An interesting book", price: 19, category: { name: "Book" }, slug: "Testing123" },
                        { _id: "p3", name: "Shirt", description: "A stylish shirt", price: 29, category: { name: "Clothing" }, slug: "Testing123"}
                    ]}
                });
            } else if (url === "/api/v1/product/product-count") {
                return Promise.resolve({
                    data: { total: 10 }
                });
            }
        });

        axios.post.mockImplementation((url, body) => {
            if (url === "/api/v1/product/product-filters") {
                const { checked = [], radio = [] } = body ?? {};
                const all = [
                { _id: 'p1', name: 'Laptop', description: "A powerful laptop", price: 999, category: { name: 'Electronics' }, slug: 'Testing123' },
                { _id: 'p2', name: 'Book Interesting', description: "An interesting book", price: 19, category: { name: 'Book' }, slug: 'Testing123' },
                { _id: 'p3', name: 'Shirt', description: "A stylish shirt", price: 29, category: { name: 'Clothing' }, slug: 'Testing123' },
                ];

                const categoryById = { c1: 'Electronics', c2: 'Book', c3: 'Clothing' };

                let out = all;

                if (checked.length) {
                const allowed = new Set(checked.map(id => categoryById[id]));
                out = out.filter(p => allowed.has(p.category.name));
                }

                if (radio.length === 2) {
                const [min, max] = radio;
                out = out.filter(p => p.price >= min && p.price <= max);
                }

                return Promise.resolve({ data: { products: out } });
            }
        });
    });

    it('renders Reset Filters Button' , async () => {
        const { getByRole } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(getByRole('button', { name: 'RESET FILTERS' })).toBeInTheDocument();
        })
    });

    it('should navigate to product details page on More Details button click', async () => {
        const { findAllByText } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        );

        const moreDetailsButtons = await findAllByText('More Details');
        await userEvent.click(moreDetailsButtons[0]);

        expect(mockNavigate).toHaveBeenCalledWith('/product/Testing123');
    });

    it('should call product-filter API when number of Checked Categories Changes', async () => {
        const spy = jest.spyOn(axios, "post");

        await act(async () => {
            render(
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
            );
        })

        await act(async () => {
            const clothingCheckbox = await screen.findByRole('checkbox', { name: 'Clothing' });
            const electronicCheckbox = await screen.findByRole('checkbox', { name: 'Electronics' })
            await userEvent.click(clothingCheckbox);
            await userEvent.click(electronicCheckbox);
            await userEvent.click(electronicCheckbox);
        });

        await waitFor( async () => {
            expect(spy).toHaveBeenCalledWith("/api/v1/product/product-filters", {"checked": ["c3"], "radio": []});
            expect(spy).toHaveBeenCalledWith("/api/v1/product/product-filters", {"checked": ["c3", "c1"], "radio": []});
            expect(spy).toHaveBeenCalledWith("/api/v1/product/product-filters", {"checked": ["c3"], "radio": []});
        });
    });

    it('should call product-filter API when selected Price Range Changes', async () => {
        const spy = jest.spyOn(axios, "post");

        await act(async () => {
            render(
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
            );
        })

        await act(async () => {
            const priceRadio1 = await screen.findByRole('radio', { name: '$0 to 19' });
            await userEvent.click(priceRadio1);
            const priceRadio2 = await screen.findByRole('radio', { name: '$20 to 39'});
            await userEvent.click(priceRadio2);
        })

        await waitFor(() => {
            expect(spy).toHaveBeenCalledWith("/api/v1/product/product-filters", {"checked": [], "radio": [0, 19]});
            expect(spy).toHaveBeenCalledWith("/api/v1/product/product-filters", {"checked": [], "radio": [20, 39]});
        });
    });

    it('should catch errors when get category API fails', async () => {
        axios.get.mockImplementationOnce((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.reject(new Error("Category API failed"));
            }
            // Let other axios.get calls still succeed
            if (url.startsWith("/api/v1/product/product-list/")) {
            return Promise.resolve({ data: { products: [
                        { _id: "p1", name: "Laptop", description: "A powerful laptop", price: 999, category: { name: "Electronics" }, slug: "Testing123" },
                        { _id: "p2", name: "Book Interesting", description: "An interesting book", price: 19, category: { name: "Book" }, slug: "Testing123" },
                        { _id: "p3", name: "Shirt", description: "A stylish shirt", price: 29, category: { name: "Clothing" }, slug: "Testing123"}
                    ]} });
                }
            if (url === "/api/v1/product/product-count") {
                return Promise.resolve({ data: { total: 10 } });
            }
        });

        render(
            <MemoryRouter initialEntries={["/"]}>
            <Routes>
                <Route path="/" element={<HomePage />} />
            </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText("All Products")).toBeInTheDocument();

        expect(toast.error).toHaveBeenCalledWith("Error getting categories, please try again later")

    });

    it('should not show any Categories when get category API returns data.success False', async () => {
        axios.get.mockImplementationOnce((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({
                    data: {
                    success: false,
                    category: [
                        { _id: "c1", name: "Electronics" },
                        { _id: "c2", name: "Book" },
                        { _id: "c3", name: "Clothing" }
                    ]
                    }
                });
            }
            if (url.startsWith("/api/v1/product/product-list/")) {
                return Promise.resolve({ data: { products: [
                    { _id: "p1", name: "Laptop", description: "A powerful laptop", price: 999, category: { name: "Electronics" }, slug: "Testing123" },
                    { _id: "p2", name: "Book Interesting", description: "An interesting book", price: 19, category: { name: "Book" }, slug: "Testing123" },
                    { _id: "p3", name: "Shirt", description: "A stylish shirt", price: 29, category: { name: "Clothing" }, slug: "Testing123"}]}
                });
            }
            if (url === "/api/v1/product/product-count") {
                return Promise.resolve({ data: { total: 10 } });
            }
        });

        render(
            <MemoryRouter initialEntries={["/"]}>
            <Routes>
                <Route path="/" element={<HomePage />} />
            </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.queryByRole('checkbox', { name: 'Electronics' })).not.toBeInTheDocument();
            expect(screen.queryByRole('checkbox', { name: 'Book' })).not.toBeInTheDocument();
            expect(screen.queryByRole('checkbox', { name: 'Clothing' })).not.toBeInTheDocument();
        });
    });

    it("should load more products when Load More is clicked", async () => {
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({
                    data: {
                    success: true,
                    category: [
                        { _id: "c1", name: "Electronics" },
                        { _id: "c2", name: "Book" },
                        { _id: "c3", name: "Clothing" }
                    ]
                    }
                });
            }
            if (url === "/api/v1/product/product-count") {
            return Promise.resolve({ data: { total: 6 } });
            }
            if (url === "/api/v1/product/product-list/1") {
            return Promise.resolve({
                data: {
                products: [
                    { _id: "p1", name: "Laptop", description: "A powerful laptop", price: 999, category: { name: "Electronics" }, slug: "laptop" },
                    { _id: "p2", name: "Book Interesting", description: "An interesting book", price: 19, category: { name: "Book" }, slug: "book" },
                    { _id: "p3", name: "Shirt", description: "A stylish shirt", price: 29, category: { name: "Clothing" }, slug: "shirt" }
                ]
                }
            });
            }
            if (url === "/api/v1/product/product-list/2") {
            return Promise.resolve({
                data: {
                    products: [
                        { _id: "p4", name: "Tablet", description: "A powerful tablet", price: 499, category: { name: "Electronics" }, slug: "tablet" },
                        { _id: "p5", name: "Notebook", description: "A plain notebook", price: 9, category: { name: "Book" }, slug: "notebook" },
                        { _id: "p6", name: "Jacket", description: "A warm jacket", price: 79, category: { name: "Clothing" }, slug: "jacket" }
                    ]
                }
            });
            }
        });

        render(
            <MemoryRouter initialEntries={["/"]}>
            <Routes>
                <Route path="/" element={<HomePage />} />
            </Routes>
            </MemoryRouter>
        );

        // Wait for first 3 products
        await waitFor(async () => {
            const initialProducts = await screen.findAllByTestId("product-name");
            expect(initialProducts).toHaveLength(3);
        });

        // Click loadmore
        const loadMoreBtn = await screen.findByRole("button", { name: /Load More/i });
        await act(async () => {
            await userEvent.click(loadMoreBtn);
        })

        // Wait for 6 products in total
        await waitFor(async () => {
            const allProducts = await screen.findAllByTestId("product-name");
            expect(allProducts).toHaveLength(6);
        });
    });


    it("should catch errors when load more Button API Call fails", async () => {
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({
                        data: { success: true, category: [
                            { _id: "c1", name: "Electronics" },
                            { _id: "c2", name: "Book" },
                            { _id: "c3", name: "Clothing" }
                        ]}
                });
            }
            if (url === "/api/v1/product/product-count") {
                return Promise.resolve({ data: { total: 10 } });
            }
            if (url.startsWith("/api/v1/product/product-list/")) {
                return Promise.reject(new Error("LoadMore API failed"));
            }
        });

        render(
            <MemoryRouter initialEntries={["/"]}>
            <Routes>
                <Route path="/" element={<HomePage />} />
            </Routes>
            </MemoryRouter>
        );

        // Click loadmore to trigger the error
        const loadMoreBtn = await screen.findByRole("button", { name: /Load More/i });

        await act(async () => {
            await userEvent.click(loadMoreBtn);
        });

        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("Error loading more products, please try again later")
        );

    });

    it("should add a product to cart and update localStorage", async () => {
        Object.defineProperty(window, "localStorage", {
            value: {
            setItem: jest.fn(),
            getItem: jest.fn(),
            removeItem: jest.fn(),
            },
            writable: true,
        });

        render(
            <MemoryRouter initialEntries={["/"]}>
            <Routes>
                <Route path="/" element={<HomePage />} />
            </Routes>
            </MemoryRouter>
        );

        const addToCartButtons = await screen.findAllByRole("button", {
            name: "ADD TO CART",
        });

        await userEvent.click(addToCartButtons[0]);

        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            "cart",
            expect.stringContaining("Laptop")
        );

        expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });

    it ("should have the same products as Original when the Filter Reset Button is clicked", async () => {
        const spy = jest.spyOn(axios, "get");
        render(
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        )

        const originalProducts = await screen.findAllByTestId("product-name");
        // Retrieve Original Products Name
        const originalNames = originalProducts.map(p => p.textContent);

        const electronicCheckbox = await screen.findByRole('checkbox', { name: 'Electronics' });
        await act( async () => {
            await userEvent.click(electronicCheckbox);
        });

        const resetFiltersButton = await screen.findByRole('button', { name: 'RESET FILTERS' });
        await act(async () => {
            await userEvent.click(resetFiltersButton);
        });

        await waitFor(() => {
            expect(spy).toHaveBeenCalledWith("/api/v1/product/product-list/1");
        });

        await screen.findByTestId('products-grid');

        await waitFor(() => {
            const currentProducts = screen.getAllByTestId("product-name");
            const currentNames = currentProducts.map(p => p.textContent);
            expect(currentNames).toEqual(originalNames);
        });
    })

    it("should catch errors when Product-Filters API fails", async () => {
        // Mock GETs just enough for the component to render
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
                return Promise.resolve({
                    data: {
                    success: true,
                    category: [{ _id: "c1", name: "Electronics" }]
                    },
                });
            }
            if (url.startsWith("/api/v1/product/product-list/")) {
                return Promise.resolve({
                    data: {
                        products: [
                            { _id: "p4", name: "Tablet", description: "A powerful tablet", price: 499, category: { name: "Electronics" }, slug: "tablet" },
                            { _id: "p5", name: "Notebook", description: "A plain notebook", price: 9, category: { name: "Book" }, slug: "notebook" },
                            { _id: "p6", name: "Jacket", description: "A warm jacket", price: 79, category: { name: "Clothing" }, slug: "jacket" }
                        ]
                    }
                });
            }
            if (url === "/api/v1/product/product-count") {
                return Promise.resolve({ data: { total: 10 } });
            }
        });

        axios.post.mockRejectedValueOnce(new Error("Filter API failed"));

        render(
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        );

        const electronicsCheckbox = await screen.findByRole("checkbox", { name: "Electronics" });
        await act(async () => {
            await userEvent.click(electronicsCheckbox);
        });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Error filtering products, please try again later")
        });
    });

    it('should catch errors when Product-Count API fails', async () => {
        axios.get.mockImplementation((url) => {
            if (url === '/api/v1/category/get-category') {
            return Promise.resolve({ data: { success: true, category: [] } });
            }
            if (url === '/api/v1/product-count' || url === '/api/v1/product/product-count') {
            return Promise.reject(new Error('count failed'));
            }
            if (url.startsWith('/api/v1/product/product-list/')) {
            return Promise.resolve({ data: { products: [] } });
            }
        });

        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Error fetching product count, please try again later");
        });
    });

    it('renders full description when length < 60', async () => {
        const shortDesc = 'Nice and short.';
        axios.get.mockImplementation((url) => {
        if (url === '/api/v1/category/get-category') {
            return Promise.resolve({ data: { success: true, category: [] } });
        }
        if (url === '/api/v1/product/product-count') {
            return Promise.resolve({ data: { total: 1 } });
        }
        if (url.startsWith('/api/v1/product/product-list/')) {
            return Promise.resolve({
            data: {
                products: [
                {
                    _id: 'p1',
                    name: 'Item',
                    description: shortDesc,
                    price: 10,
                    category: { name: 'Misc' },
                    slug: 'item'
                }
                ],
            },
            });
        }
        });

        render(
        <MemoryRouter initialEntries={['/']}>
            <Routes>
            <Route path="/" element={<HomePage />} />
            </Routes>
        </MemoryRouter>
        );

        // Wait for the product to show
        expect(await screen.findByText('Item')).toBeInTheDocument();

        // Exact full description, no ellipsis
        expect(screen.getByText(shortDesc)).toBeInTheDocument();
        expect(screen.queryByText(/\.{3}$/)).not.toBeInTheDocument();
    });

    it('shows no products if Product Filter API returns no Products field', async () => {
        axios.get.mockImplementation((url) => {
            if (url === "/api/v1/category/get-category") {
            return Promise.resolve({
                data: { success: true, category: [
                { _id: "c1", name: "Electronics" },
                { _id: "c2", name: "Book" },
                { _id: "c3", name: "Clothing" },
                ] }
            });
            }
            if (url === "/api/v1/product/product-count") {
            return Promise.resolve({ data: { total: 10 } });
            }
            if (url.startsWith("/api/v1/product/product-list/")) {
            return Promise.resolve({
                data: { products: [
                { _id: "p1", name: "Laptop", description: "A powerful laptop", price: 999, category: { name: "Electronics" }, slug: "laptop" },
                { _id: "p2", name: "Interesting Novel", description: "An interesting book", price: 19, category: { name: "Book" }, slug: "book" },
                { _id: "p3", name: "Shirt", description: "A stylish shirt", price: 29, category: { name: "Clothing" }, slug: "shirt" },
                ] }
            });
            }
        });

        axios.post.mockImplementation((url) => {
            if (url === "/api/v1/product/product-filters") {
            return Promise.resolve({ data: { } });
            }
        });

        render(
            <MemoryRouter initialEntries={['/']}>
            <Routes>
                <Route path="/" element={<HomePage />} />
            </Routes>
            </MemoryRouter>
        );

        const electronicCheckbox = await screen.findByRole('checkbox', { name: 'Electronics' });
        await act(async () => {
            await userEvent.click(electronicCheckbox);
        });

        // Wait for the grid to update to "no items"
        await waitFor(() => {
            expect(screen.queryByTestId('product-name')).not.toBeInTheDocument();
        });
    });

    it('truncates to 60 chars and appends ellipsis when length ≥ 60', async () => {
        const longDesc = 'L'.repeat(80); // 80 chars
        const expected = longDesc.substring(0, 60) + '...';

        axios.get.mockImplementation((url) => {
        if (url === '/api/v1/category/get-category') {
            return Promise.resolve({ data: { success: true, category: [] } });
        }
        if (url === '/api/v1/product/product-count') {
            return Promise.resolve({ data: { total: 1 } });
        }
        if (url.startsWith('/api/v1/product/product-list/')) {
            return Promise.resolve({
            data: {
                products: [
                {
                    _id: 'p1',
                    name: 'Long Item',
                    description: longDesc,
                    price: 10,
                    category: { name: 'Misc' },
                    slug: 'long-item'
                }
                ],
            },
            });
        }
        });

        render(
        <MemoryRouter initialEntries={['/']}>
            <Routes>
            <Route path="/" element={<HomePage />} />
            </Routes>
        </MemoryRouter>
        );

        expect(await screen.findByText('Long Item')).toBeInTheDocument();

        // Shows the truncated description with ellipsis
        expect(screen.getByText(expected)).toBeInTheDocument();

        // And does not show the full long string
        expect(screen.queryByText(longDesc)).not.toBeInTheDocument();
    });
});
