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

    it ('renders All Products Title' , async () => {
        const { getByText } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        )
        
        await waitFor(() => {
            expect(getByText('All Products')).toBeInTheDocument();
        })
    });

    it ('renders Filter by Category Title' , async () => {
        const { getByText } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(getByText('Filter By Category')).toBeInTheDocument();
        })
    });

    it ('renders Filter by Price Title' , async () => {
        const { getByText } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(getByText('Filter By Price')).toBeInTheDocument();
        })
    });

    it ('renders Reset Filters Button' , async () => {
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

    it ('renders categories from mocked API', async () => {
        const { getByText } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        )

        //Categories from mocked API
        await waitFor(() => {
            expect( getByText('Electronics')).toBeInTheDocument();
            expect( getByText("Book")).toBeInTheDocument();
            expect( getByText("Clothing")).toBeInTheDocument();
        });
    });

    it ('renders price ranges filter from mocked API', async () => {
        const { findByText } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        )

        //Price Ranges from mocked API
        expect(await findByText('$0 to 19')).toBeInTheDocument();
        expect(await findByText("$20 to 39")).toBeInTheDocument();
        expect(await findByText("$40 to 59")).toBeInTheDocument();
        expect(await findByText("$60 to 79")).toBeInTheDocument();
        expect(await findByText("$80 to 99")).toBeInTheDocument();
        expect(await findByText("$100 or more")).toBeInTheDocument();
    })

    it ('renders More Details and Add to Cart buttons in all Grid items', async () => {
        const { findAllByText } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        );
        //Buttons from mocked API Products
        const moreDetailsButtons = await findAllByText('More Details');
        const addToCartButtons = await findAllByText('ADD TO CART');
        expect(moreDetailsButtons.length).toBeGreaterThan(0);
        expect(addToCartButtons.length).toBeGreaterThan(0);
        expect(moreDetailsButtons.length).toBe(3);
        expect(addToCartButtons.length).toBe(3);
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

    it('should filter Electronic products by category when Electronics checkbox is clicked', async () => {
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
            const electronicCheckbox = await screen.findByRole('checkbox', { name: 'Electronics' });
            await userEvent.click(electronicCheckbox);
        });

        await screen.findByTestId('products-grid'); // wait until products grid is mounted

        await waitFor(() => {
                expect(screen.queryByText('Book Interesting')).not.toBeInTheDocument();
                expect(screen.queryByText('Shirt')).not.toBeInTheDocument();
                expect(screen.queryByText('Laptop')).toBeInTheDocument();
        });
    });

    it ('should filter Book products by category when a Book checkbox is clicked', async () => {
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
            const bookCheckbox = await screen.findByRole('checkbox', { name: 'Book' });
            await userEvent.click(bookCheckbox);
        });

        await screen.findByTestId('products-grid'); // wait until products grid is mounted

        await waitFor(() => {
                expect(screen.queryByText('Shirt')).not.toBeInTheDocument();
                expect(screen.queryByText('Laptop')).not.toBeInTheDocument();
                expect(screen.queryByText('Book Interesting')).toBeInTheDocument();
        });
    });

    it ('should filter Clothing products by category when a Clothing checkbox is clicked', async () => {
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
            await userEvent.click(clothingCheckbox);
        });

        await screen.findByTestId('products-grid'); // wait until products grid is mounted

        await waitFor(() => {
            expect(screen.queryByText('Laptop')).not.toBeInTheDocument();
            expect(screen.queryByText('Book Interesting')).not.toBeInTheDocument();
            expect(screen.queryByText('Shirt')).toBeInTheDocument();
        });
    });

    it ('should filter products by price when a $0 to 19 price radio button is selected', async () => {
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
            const priceRadio = await screen.findByRole('radio', { name: '$0 to 19' });
            await userEvent.click(priceRadio);
        })

        await screen.findByTestId('products-grid'); // wait until products grid is mounted

        await waitFor(() => {
            expect(screen.queryByText('Laptop')).not.toBeInTheDocument();
            expect(screen.queryByText('Shirt')).not.toBeInTheDocument();
            expect(screen.queryByText('Book Interesting')).toBeInTheDocument();
        });
    });

    it ('should filter products by price when a $20 to 39 price radio button is selected', async () => {
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
            const priceRadio = await screen.findByRole('radio', { name: '$20 to 39' });
            await userEvent.click(priceRadio);
        })

        await screen.findByTestId('products-grid'); // wait until products grid is mounted

        await waitFor(() => {
            expect(screen.queryByText('Laptop')).not.toBeInTheDocument();
            expect(screen.queryByText('Book Interesting')).not.toBeInTheDocument();
             expect(screen.queryByText('Shirt')).toBeInTheDocument();
        });
    });

    it ('should filter products by price when a $100 or more price radio button is selected', async () => {
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
            const priceRadio = await screen.findByRole('radio', { name: '$100 or more' });
            await userEvent.click(priceRadio);
        })

        await screen.findByTestId('products-grid'); // wait until products grid is mounted

        await waitFor(() => {
            expect(screen.queryByText('Shirt')).not.toBeInTheDocument();
            expect(screen.queryByText('Book Interesting')).not.toBeInTheDocument();
            expect(screen.queryByText('Laptop')).toBeInTheDocument();
        });
    });

    it ('should catch errors when get category API fails', async () => {
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

        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        render(
            <MemoryRouter initialEntries={["/"]}>
            <Routes>
                <Route path="/" element={<HomePage />} />
            </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText("All Products")).toBeInTheDocument();

        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        expect(consoleSpy.mock.calls[0][0].message).toBe("Category API failed");

        consoleSpy.mockRestore();
    });

    it("should load more products when Loadmore is clicked", async () => {
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
        const initialProducts = await screen.findAllByTestId("product-name");
        expect(initialProducts).toHaveLength(3);

        // Click loadmore
        const loadMoreBtn = await screen.findByRole("button", { name: /Loadmore/i });
        await act(async () => {
            await userEvent.click(loadMoreBtn);
        })

        // Wait for 6 products in total
        await waitFor(async () => {
            const allProducts = await screen.findAllByTestId("product-name");
            expect(allProducts).toHaveLength(6);
        });
    });


    it("should catch errors when loadMore Button API Call fails", async () => {
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

        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        render(
            <MemoryRouter initialEntries={["/"]}>
            <Routes>
                <Route path="/" element={<HomePage />} />
            </Routes>
            </MemoryRouter>
        );

        // Click loadmore to trigger the error
        const loadMoreBtn = await screen.findByRole("button", { name: /Loadmore/i });

        await act(async () => {
            await userEvent.click(loadMoreBtn);
        });

        await waitFor(() =>
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error))
        );
        expect(consoleSpy.mock.calls[0][0].message).toBe("LoadMore API failed");

        consoleSpy.mockRestore();
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

        await screen.findByTestId('products-grid'); // wait until products grid is mounted

        await waitFor(() => {
            const currentProducts = screen.getAllByTestId("product-name");
            const currentNames = currentProducts.map(p => p.textContent);
            expect(currentNames).toEqual(originalNames);
        });
    })

    it("should catch errors when filterProduct API fails", async () => {
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

        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        render(
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        );

        // Act: click checkbox → triggers filterProduct → axios.post rejects
        const electronicsCheckbox = await screen.findByRole("checkbox", { name: "Electronics" });
        await act(async () => {
            await userEvent.click(electronicsCheckbox);
        });

        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        expect(consoleSpy.mock.calls[0][0].message).toBe("Filter API failed");

        consoleSpy.mockRestore();
    });
});