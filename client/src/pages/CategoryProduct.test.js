// CategoryProduct.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import CategoryProduct from "./CategoryProduct";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/cart";

jest.mock("axios");

jest.mock("../components/Layout", () => {
  return ({ children }) => <div data-testid="layout">{children}</div>;
});

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useParams: jest.fn(),
    useNavigate: jest.fn(),
  };
});

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

jest.mock("../utils/productUtils", () => ({
  formatPrice: (n) => `$${Number(n).toFixed(2)}`,
  getImageUrl: (id) => `/img/${id}`,
  addToCart: jest.fn(),
  handleImgError: jest.fn(),
}));

const SLUG_SHIRTS = "shirts";
const SLUG_PANTS = "pants";
const CATEGORY_SHIRTS = "Shirts";
const CATEGORY_PANTS = "Pants";

const ROUTE_SHIRTS = `/category/${SLUG_SHIRTS}`;
const ROUTE_PANTS = `/category/${SLUG_PANTS}`;

const API_COUNT = (slug) => `/api/v1/product/product-category-count/${slug}`;
const API_PAGE = (slug, page, limit = 6) =>
  `/api/v1/product/product-category/${slug}?page=${page}&limit=${limit}`;

const renderWithRouter = (ui, initialEntries = [ROUTE_SHIRTS]) =>
  render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);

const makeProduct = (overrides = {}) => ({
  _id: overrides._id ?? "p1",
  name: overrides.name ?? "Blue Tee",
  price: overrides.price ?? 100,
  slug: overrides.slug ?? "blue-tee",
  description: overrides.description ?? "A comfy tee",
  ...overrides,
});

describe("CategoryProduct", () => {
  const navigate = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    useParams.mockReturnValue({ slug: SLUG_SHIRTS });
    useNavigate.mockReturnValue(navigate);
    useCart.mockReturnValue([[], jest.fn()]);
  });

  describe("Data fetching & lifecycle", () => {
    it("fetches count and page 1 on mount and renders products", async () => {
      const totalProducts = 13;

      // mock 6 products for page 1
      const productsPage1 = Array.from({ length: 6 }).map((_, i) =>
        makeProduct({ _id: `p${i + 1}`, name: `P${i + 1}`, slug: `p${i + 1}` })
      );

      // mock API responses for total count of 13 and page 1 results
      axios.get
        .mockResolvedValueOnce({
          data: { success: true, total: totalProducts },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products: productsPage1,
          },
        });

      renderWithRouter(<CategoryProduct />);

      // verify API calls
      await waitFor(() =>
        expect(axios.get).toHaveBeenNthCalledWith(1, API_COUNT(SLUG_SHIRTS))
      );
      expect(axios.get).toHaveBeenNthCalledWith(2, API_PAGE(SLUG_SHIRTS, 1, 6));

      // verify rendered output
      expect(
        await screen.findByText(`Category - ${CATEGORY_SHIRTS}`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`${totalProducts} results found`, "i"))
      ).toBeInTheDocument();
      productsPage1.forEach((p) => {
        expect(screen.getByText(p.name)).toBeInTheDocument();
      });
    });

    it("refetches when slug changes and resets state", async () => {
      const shirtsPage1 = [makeProduct({ name: "ShirtA" })];
      const pantsPage1 = [makeProduct({ _id: "q1", name: "PantA" })];

      useParams.mockReturnValueOnce({ slug: SLUG_SHIRTS }); // initial render with shirts slug
      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 1 } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products: shirtsPage1,
          },
        });

      const { rerender } = renderWithRouter(<CategoryProduct />);

      // wait for products to load
      expect(await screen.findByText(shirtsPage1[0].name)).toBeInTheDocument();

      useParams.mockReturnValueOnce({ slug: SLUG_PANTS }); // change slug to pants
      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 1 } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_PANTS },
            products: pantsPage1,
          },
        });

      rerender(
        <MemoryRouter initialEntries={[ROUTE_PANTS]}>
          <CategoryProduct />
        </MemoryRouter>
      );

      // verify new products load and old products are gone
      expect(
        await screen.findByText(`Category - ${CATEGORY_PANTS}`)
      ).toBeInTheDocument();
      expect(screen.getByText(/1 result found/i)).toBeInTheDocument();
      expect(screen.getByText(pantsPage1[0].name)).toBeInTheDocument();
      expect(screen.queryByText(shirtsPage1[0].name)).toBeNull();
    });

    it("does not fetch when slug is missing", async () => {
      useParams.mockReturnValueOnce({ slug: undefined });

      renderWithRouter(<CategoryProduct />, ["/category/"]);

      await waitFor(() => expect(axios.get).not.toHaveBeenCalled());
    });
  });
});
