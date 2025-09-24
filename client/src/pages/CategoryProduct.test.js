import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import CategoryProduct from "./CategoryProduct";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/cart";
import { addToCart } from "../utils/productUtils";
import { toast } from "react-hot-toast";

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

jest.mock("react-hot-toast");

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

  describe("Rendering & content", () => {
    it("shows pluralized results count", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 2 } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products: [
              makeProduct({ name: "First" }),
              makeProduct({ _id: "p2", name: "Second" }),
            ],
          },
        });

      renderWithRouter(<CategoryProduct />);
      expect(await screen.findByText(/2 results found/i)).toBeInTheDocument(); // plural "results"
    });

    it("shows singular result count", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 1 } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products: [makeProduct({ name: "Solo" })],
          },
        });

      renderWithRouter(<CategoryProduct />);
      expect(await screen.findByText(/1 result found/i)).toBeInTheDocument(); // singular "result"
    });

    it("renders description truncated and fallback when missing", async () => {
      const longDesc =
        "This is a very long description that should be truncated at sixty characters to keep the card compact.";
      const products = [
        makeProduct({ name: "LongDesc", description: longDesc }),
        makeProduct({ _id: "p2", name: "NoDesc", description: undefined }),
      ]; // one with long desc, one without

      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 2 } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products,
          },
        });

      renderWithRouter(<CategoryProduct />);

      expect(
        await screen.findByText(`Category - ${CATEGORY_SHIRTS}`)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/This is a very long description/)
      ).toBeInTheDocument();
      expect(screen.getByText(/No description available/)).toBeInTheDocument();
    });

    it("shows empty state when no products and total=0", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 0 } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products: [],
          },
        });

      renderWithRouter(<CategoryProduct />);

      expect(
        await screen.findByText(/No products found in this category/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Load more/i })
      ).not.toBeInTheDocument();
    });

    it("hides Load more when all items already loaded", async () => {
      // total 3 products but only 3 returned on page 1, so no more to load
      const page1 = Array.from({ length: 3 }).map((_, i) =>
        makeProduct({ _id: `p${i + 1}`, name: `P${i + 1}` })
      );

      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 3 } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products: page1,
          },
        });

      renderWithRouter(<CategoryProduct />);

      expect(await screen.findByText("P3")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Load more/i })).toBeNull();
    });
  });

  it("shows Load more button when not all items are loaded", async () => {
    // total 10 products but only 6 returned on page 1, so more to load
    const totalProducts = 10;
    const page1 = Array.from({ length: 6 }).map((_, i) =>
      makeProduct({ _id: `p${i + 1}`, name: `P${i + 1}` })
    );

    axios.get
      .mockResolvedValueOnce({ data: { success: true, total: totalProducts } })
      .mockResolvedValueOnce({
        data: {
          success: true,
          category: { name: CATEGORY_SHIRTS },
          products: page1,
        },
      });
    renderWithRouter(<CategoryProduct />);

    expect(
      await screen.findByText(page1[page1.length - 1].name)
    ).toBeInTheDocument(); // wait for last product to confirm load
    expect(
      screen.getByRole("button", { name: /Load more/i })
    ).toBeInTheDocument();
  });

  describe("Interactions", () => {
    it("navigates to product details on 'More Details'", async () => {
      const p = makeProduct({ name: "GoDetails", slug: "go-details" });

      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 1 } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products: [p],
          },
        });

      renderWithRouter(<CategoryProduct />);

      expect(await screen.findByText(p.name)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /More Details/i }));
      expect(navigate).toHaveBeenCalledWith(`/product/${p.slug}`);
    });

    it("calls addToCart on 'ADD TO CART'", async () => {
      const p = makeProduct({ _id: "123", name: "CartItem" });

      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 1 } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products: [p],
          },
        });

      renderWithRouter(<CategoryProduct />);

      expect(await screen.findByText(p.name)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /ADD TO CART/i }));
      expect(addToCart).toHaveBeenCalledTimes(1);
      const call = addToCart.mock.calls[0];
      expect(call[2]).toMatchObject({ _id: "123", name: "CartItem" }); // make sure correct product passed as argument
    });

    it("fetches next page, appends results, disables button while loading on 'Load more'", async () => {
      const page1 = Array.from({ length: 6 }).map((_, i) =>
        makeProduct({ _id: `p${i + 1}`, name: `P${i + 1}`, slug: `p${i + 1}` })
      );
      const page2 = [
        makeProduct({ _id: "p7", name: "P7", slug: "p7" }),
        makeProduct({ _id: "p8", name: "P8", slug: "p8" }),
      ];

      axios.get
        .mockResolvedValueOnce({
          data: { success: true, total: page1.length + page2.length },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products: page1,
          },
        })
        .mockResolvedValueOnce({ data: { success: true, products: page2 } });

      renderWithRouter(<CategoryProduct />);

      expect(
        await screen.findByText(`Category - ${CATEGORY_SHIRTS}`)
      ).toBeInTheDocument();

      const btn = screen.getByRole("button", { name: /Load more/i });
      fireEvent.click(btn);
      expect(btn).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByText(page2[page2.length - 1].name)
        ).toBeInTheDocument();
      });
      expect(screen.queryByRole("button", { name: /Load more/i })).toBeNull();
    });
  });

  describe("Error states", () => {
    it("shows error toast when count fetch fails", async () => {
      axios.get.mockRejectedValueOnce(new Error("Network error"));
      renderWithRouter(<CategoryProduct />);
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to load total products"
        )
      );
    });

    it("shows error toast when products fetch fails (page 1) and shows empty state", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 3 } })
        .mockRejectedValueOnce(new Error("Network error"));

      renderWithRouter(<CategoryProduct />);

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Failed to load products")
      );
      expect(
        screen.getByText(/No products found in this category/i)
      ).toBeInTheDocument();
    });

    it("shows error toast when products fetch fails (page 2) and keeps previous products", async () => {
      // total 7 products but only 6 returned on page 1, so more to load
      const page1 = Array.from({ length: 6 }).map((_, i) =>
        makeProduct({ _id: `p${i + 1}`, name: `P${i + 1}` })
      );

      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 7 } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products: page1,
          },
        })
        .mockRejectedValueOnce(new Error("Network error"));

      renderWithRouter(<CategoryProduct />);

      expect(
        await screen.findByText(page1[page1.length - 1].name)
      ).toBeInTheDocument(); // wait for page 1 load

      // click Load more to fetch page 2 which will trigger error
      const btn = screen.getByRole("button", { name: /Load more/i });
      fireEvent.click(btn);

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Failed to load products")
      );

      for (const p of page1) {
        expect(screen.getByText(p.name)).toBeInTheDocument();
      }
      expect(
        screen.getByRole("button", { name: /Load more/i })
      ).toBeInTheDocument(); // button still there to retry
    });

    it("shows error toast with success=false in products response", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { success: true, total: 3 } })
        .mockResolvedValueOnce({ data: { success: false } });
      renderWithRouter(<CategoryProduct />);
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Failed to load products")
      );
      expect(
        screen.getByText(/No products found in this category/i)
      ).toBeInTheDocument();
    });

    it("shows error toast with success=false in total products response", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { success: false } })
        .mockResolvedValueOnce({
          data: {
            success: true,
            category: { name: CATEGORY_SHIRTS },
            products: [],
          },
        });

      renderWithRouter(<CategoryProduct />);

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to load total products"
        )
      );
    });
  });
});
