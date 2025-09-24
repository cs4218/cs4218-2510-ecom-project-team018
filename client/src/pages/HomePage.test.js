import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { Prices } from "../components/Prices";
import toast from "react-hot-toast";
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { addToCart } from '../utils/productUtils';
import '@testing-library/jest-dom/extend-expect';
import HomePage from './HomePage';

// Mocking axios.post
jest.mock('axios');
jest.mock('react-hot-toast');

const mockCart = [];
const mockSetCart = jest.fn();

jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => [mockCart, mockSetCart]),
}));

jest.mock('../utils/productUtils.js', () => ({
  addToCart: jest.fn(() => {})
}))

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

jest.mock("../components/Prices", () => ({
  Prices: [
    { _id: 0, name: "$0 to 19", array: [0, 19] },
    { _id: 1, name: "$20 to 39", array: [20, 39] },
    { _id: 2, name: "$40 to 59", array: [40, 59] },
    { _id: 3, name: "$60 to 79", array: [60, 79] },
    { _id: 4, name: "$80 to 99", array: [80, 99] },
    { _id: 5, name: "$100 or more", array: [100, 9999] }
  ],
}));

const mockNavigate = jest.fn();

const listOfProducts = [
  { _id: "p1", name: "Laptop", description: "A powerful laptop", price: 999, category: { name: "Electronics" }, slug: "Testing123" },
  { _id: "p2", name: "Book Interesting", description: "An interesting book", price: 19, category: { name: "Book" }, slug: "Testing123" },
  { _id: "p3", name: "Shirt", description: "A stylish shirt", price: 29, category: { name: "Clothing" }, slug: "Testing123"}
];

const listOfMoreProducts = [
  { _id: "p4", name: "Tablet", description: "A powerful tablet", price: 499, category: { name: "Electronics" }, slug: "tablet" },
  { _id: "p5", name: "Notebook", description: "A plain notebook", price: 9, category: { name: "Book" }, slug: "notebook" },
  { _id: "p6", name: "Jacket", description: "A warm jacket", price: 79, category: { name: "Clothing" }, slug: "jacket" }
];

const listOfCategories = [
  { _id: "c1", name: "Electronics" },
  { _id: "c2", name: "Book" },
  { _id: "c3", name: "Clothing" }
];

const listOfProductWithLongDescription = [
  { _id: 'p1', name: 'Long Item', description: 'L'.repeat(80), price: 10, category: { name: 'Misc' }, slug: 'long-item'}
];

const categoryById = { c1: 'Electronics', c2: 'Book', c3: 'Clothing' };
const IdByCategory = { 'Electronics': 'c1', 'Book': 'c2', 'Clothing': 'c3' };

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe('HomePage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: listOfCategories } });
      }
      if (url.startsWith("/api/v1/product/product-list/")) {
        return Promise.resolve({ data: { products: listOfProducts } });
      }
      if (url === "/api/v1/product/product-count") {
        return Promise.resolve({ data: { total: 10 } });
      }
    });

    axios.post.mockImplementation((url, body) => {
      if (url === "/api/v1/product/product-filters") {
        const { checked = [], radio = [] } = body ?? {};
        const all = listOfProducts;
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

  describe('Rendering Reset Filter Button & Navigation Link', () => {
    it('renders Reset Filters Button' , async () => {
      const { getByRole } = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getByRole('button', { name: 'RESET FILTERS' })).toBeInTheDocument();
      });
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

      expect(mockNavigate).toHaveBeenCalledWith('/product/' + listOfProducts[0].slug);
    });
  });

  describe('Filtering by Prices and Categories', () => {
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
      });

      await act(async () => {
        const clothingCheckbox = await screen.findByRole('checkbox', { name: listOfCategories[0].name });
        const electronicCheckbox = await screen.findByRole('checkbox', { name: listOfCategories[1].name });
        await userEvent.click(clothingCheckbox);
        await userEvent.click(electronicCheckbox);
        await userEvent.click(electronicCheckbox);
      });

      await waitFor(() => {
        expect(spy).toHaveBeenNthCalledWith(
          1,
          "/api/v1/product/product-filters",
          { checked: [IdByCategory[listOfCategories[0].name]], radio: [] }
        );

        expect(spy).toHaveBeenNthCalledWith(
          2,
          "/api/v1/product/product-filters",
          { checked: [
              IdByCategory[listOfCategories[0].name],
              IdByCategory[listOfCategories[1].name]
            ], radio: [] }
        );

        expect(spy).toHaveBeenNthCalledWith(
          3,
          "/api/v1/product/product-filters",
          { checked: [IdByCategory[listOfCategories[0].name]], radio: [] }
        );
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
      });

      await act(async () => {
        const priceRadio1 = await screen.findByRole('radio', { name: Prices[0].name });
        await userEvent.click(priceRadio1);
        const priceRadio2 = await screen.findByRole('radio', { name: Prices[1].name});
        await userEvent.click(priceRadio2);
      });

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith("/api/v1/product/product-filters", {"checked": [], "radio": Prices[0].array });
        expect(spy).toHaveBeenCalledWith("/api/v1/product/product-filters", {"checked": [], "radio": Prices[1].array });
      });
    });

    it("should call product-filter API when checked Category is unchecked and render the returned products", async () => {
      const spyPost = jest.spyOn(axios, "post");
      const spyGet = jest.spyOn(axios, "get");
      const updatedList = [listOfProducts[0], listOfMoreProducts[1]];

      axios.post.mockImplementation((url, body) => {
        if (url === "/api/v1/product/product-filters") {
          return Promise.resolve({ data: { products: [listOfProducts[0]] } }); // filtered result
        }
      });

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/product-list")) {
          return Promise.resolve({ data: { products: updatedList } }); // fallback result
        }
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({ data: { success: true, category: listOfCategories } });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 10 } });
        }
      });

      await act(async () => {
        render(
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              <Route path="/" element={<HomePage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      await act(async () => {
        const electronicCheckbox = await screen.findByRole("checkbox", {
          name: listOfCategories[0].name,
        });
        await userEvent.click(electronicCheckbox); // filter
        await userEvent.click(electronicCheckbox); // unfilter
      });

      await waitFor(() => {
        expect(spyPost).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          { checked: [IdByCategory[listOfCategories[0].name]], radio: [] }
        );

        expect(spyGet).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/product/product-list")
        );
      });

      const currentNames = (await screen.findAllByTestId("product-name")).map(el => el.textContent);
      expect(currentNames).toEqual(updatedList.map(p => p.name));
    });



    it("requests page 1 when Reset Filters button is clicked and renders the returned products", async () => {
        const spy = jest.spyOn(axios, "get");

        render(
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </MemoryRouter>
        );

        // sanity: initial list rendered
        expect(await screen.findAllByTestId("product-name")).toHaveLength(3);

        const updatedList = [ listOfProducts[0], listOfProducts[1] ];
        axios.post.mockImplementation((url) => {
          if (url === "/api/v1/product/product-filters") {
            return Promise.resolve({ data: { } });
          }
        });
        axios.get.mockImplementationOnce((url) => {
            if (url === "/api/v1/product/product-list/1") {
            return Promise.resolve({ data: { products: updatedList } });
            }
            return Promise.resolve({ data: {} });
        });

        const resetFiltersButton = await screen.findByRole("button", { name: "RESET FILTERS" });
        await act(async () => { await userEvent.click(resetFiltersButton); });

        await waitFor(() => {
            expect(spy).toHaveBeenCalledWith("/api/v1/product/product-list/1");
        });

        const currentNames = (await screen.findAllByTestId("product-name")).map(el => el.textContent);
        expect(currentNames).toEqual(updatedList.map(p => p.name));
    });


    it('shows no products if Product Filter API returns no Products field', async () => {
      // override post mock for this test only
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

      await waitFor(() => {
        expect(screen.queryByTestId('product-name')).not.toBeInTheDocument();
      });
    });
  });

  describe('Load More Button Interaction', () => {
    it("should load more products when Load More is clicked", async () => {
      // override get for paged responses
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({ data: { success: true, category: listOfCategories }});
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 6 }});
        }
        if (url === "/api/v1/product/product-list/1") {
          return Promise.resolve({ data: { products: listOfProducts }});
        }
        if (url === "/api/v1/product/product-list/2") {
          return Promise.resolve({ data: { products: listOfMoreProducts }});
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
      });

      // Wait for 6 products in total
      await waitFor(async () => {
        const allProducts = await screen.findAllByTestId("product-name");
        expect(allProducts).toHaveLength(6);
      });
    });

    it("should catch errors when load more Button API Call fails", async () => {
      // When product-list page requests happen, reject them
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({ data: { success: true, category: listOfCategories }});
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

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Error loading more products, please try again later");
      });
    });
  });

  describe('API Error Handling', () => {
    it('should catch errors when get category API fails', async () => {
      // override only the category GET to fail once
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.reject(new Error("Category API failed"));
        }
        if (url.startsWith("/api/v1/product/product-list/")) {
          return Promise.resolve({ data: { products: listOfProducts }});
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 10 }});
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
        expect(toast.error).toHaveBeenCalledWith("Error getting categories, please try again later");
      });
    });

    it("should catch errors when Product-Filters API fails", async () => {
      // Mock GETs just enough for the component to render
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({ data: { success: true, category: listOfCategories }});
        }
        if (url.startsWith("/api/v1/product/product-list/")) {
          return Promise.resolve({ data: { products: listOfProducts }});
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 10 }});
        }
      });

      // Make the POST filter fail
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
        expect(toast.error).toHaveBeenCalledWith("Error filtering products, please try again later");
      });
    });

    it('should catch errors when Product-Count API fails', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/v1/category/get-category') {
          return Promise.resolve({ data: { success: true, category: listOfCategories } });
        }
        if (url === '/api/v1/product-count' || url === '/api/v1/product/product-count') {
          return Promise.reject(new Error('count failed'));
        }
        if (url.startsWith('/api/v1/product/product-list/')) {
          return Promise.resolve({ data: { products: listOfProducts } });
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

    it('should not show any Categories when get category API returns data.success False', async () => {
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({ data: { success: false, category: listOfCategories }});
        }
        if (url.startsWith("/api/v1/product/product-list/")) {
          return Promise.resolve({ data: { products: listOfProducts }});
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
        expect(screen.queryByRole('checkbox', { name: listOfCategories[0].name })).not.toBeInTheDocument();
        expect(screen.queryByRole('checkbox', { name: listOfCategories[1].name })).not.toBeInTheDocument();
        expect(screen.queryByRole('checkbox', { name: listOfCategories[2].name })).not.toBeInTheDocument();
      });
    });
  });

  describe('Cart Interaction', () => {
    it("should call addToCart function when ADD TO CART Button is presssed", async () => {
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

      expect(addToCart).toHaveBeenCalledWith(
        mockCart,
        mockSetCart,
        listOfProducts[0]
      );
    });


  describe('Product Description Length Logic', () => {
    it('renders full description when length < 60', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/v1/category/get-category') {
          return Promise.resolve({ data: { success: true, category: listOfCategories } });
        }
        if (url === '/api/v1/product/product-count') {
          return Promise.resolve({ data: { total: 1 } });
        }
        if (url.startsWith('/api/v1/product/product-list/')) {
          return Promise.resolve({ data: { products: listOfProducts }});
        }
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for the products to show
      expect(await screen.findByText(listOfProducts[0].name)).toBeInTheDocument();
      expect(await screen.findByText(listOfProducts[1].name)).toBeInTheDocument();
      expect(await screen.findByText(listOfProducts[2].name)).toBeInTheDocument();

      // Exact full description, no ellipsis
      expect(screen.getByText(listOfProducts[0].description)).toBeInTheDocument();
      expect(screen.getByText(listOfProducts[1].description)).toBeInTheDocument();
      expect(screen.getByText(listOfProducts[2].description)).toBeInTheDocument();
      expect(screen.queryByText(/\.{3}$/)).not.toBeInTheDocument();
    });

    it('truncates to 60 chars and appends ellipsis when length ≥ 60', async () => {
      const expected = listOfProductWithLongDescription[0].description.substring(0, 60) + '...';

      axios.get.mockImplementation((url) => {
        if (url === '/api/v1/category/get-category') {
          return Promise.resolve({ data: { success: true, category: listOfCategories } });
        }
        if (url === '/api/v1/product/product-count') {
          return Promise.resolve({ data: { total: 1 } });
        }
        if (url.startsWith('/api/v1/product/product-list/')) {
          return Promise.resolve({ data: { products: listOfProductWithLongDescription }});
        }
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText(listOfProductWithLongDescription[0].name)).toBeInTheDocument();
      expect(screen.getByText(expected)).toBeInTheDocument();
      expect(screen.queryByText(listOfProductWithLongDescription[0].description)).not.toBeInTheDocument();
    });
  });
  });
})