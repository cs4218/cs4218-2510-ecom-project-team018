import React from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProductDetails from "./ProductDetails";

// Mocks
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));
const mockSetCart = jest.fn();
jest.mock("../context/cart", () => ({
  useCart: () => [[{ _id: "existing" }], mockSetCart],
}));

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

jest.mock("../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));
jest.mock("../hooks/useCategory", () => jest.fn(() => []));
jest.spyOn(console, "error").mockImplementation(() => {});

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: "test-product" }),
}));

// Test Data
const MAIN_PRODUCT = {
  _id: "123",
  name: "Test Product",
  description: "This is a test product",
  price: 100,
  category: { _id: "cat1", name: "Test Category" },
  slug: "test-product",
};

const SIMILAR_PRODUCT_1 = {
  _id: "456",
  name: "Similar Product 1",
  description: "This is a similar product 1",
  price: 50,
  slug: "similar-product-1",
};

const SIMILAR_PRODUCT_2 = {
  _id: "789",
  name: "Similar Product 2",
  description: "This is a similar product 2",
  price: 75,
  slug: "similar-product-2",
};

// Helper functions
const renderWithRouter = (route = "/product/test-product") =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/product/:slug" element={<ProductDetails />} />
      </Routes>
    </MemoryRouter>
  );

describe("ProductDetails Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // API Errors
  describe("API errors", () => {
    it("renders 'No Such Product Found' for 404", async () => {
      axios.get.mockRejectedValue({ response: { status: 404 } });
      renderWithRouter("/product/non-existent");
      expect(
        await screen.findByText(/No Such Product Found./i)
      ).toBeInTheDocument();
    });

    it("renders error message for network failure", async () => {
      axios.get.mockRejectedValue(new Error("Network Error"));
      renderWithRouter("/product/error-product");
      expect(
        await screen.findByText(/Failed to load product details/i)
      ).toBeInTheDocument();
    });

    it("shows 'No Similar Products found' if similar products fetch fails", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: MAIN_PRODUCT } })
        .mockRejectedValueOnce(new Error("Network Error"));

      renderWithRouter();
      expect(
        await screen.findByText(new RegExp(MAIN_PRODUCT.name))
      ).toBeInTheDocument();
      expect(
        await screen.findByText(/No similar products found/i)
      ).toBeInTheDocument();
    });
  });

  // Main Product
  describe("Main product rendering", () => {
    it("renders product details correctly", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: MAIN_PRODUCT } })
        .mockResolvedValueOnce({ data: { products: [] } });

      renderWithRouter();

      expect(screen.getByText(/Product Details/i)).toBeInTheDocument();
      expect(
        await screen.findByText(new RegExp(MAIN_PRODUCT.name))
      ).toBeInTheDocument();
      expect(
        await screen.findByText(new RegExp(MAIN_PRODUCT.description))
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`\\$${MAIN_PRODUCT.price}.00`))
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(MAIN_PRODUCT.category.name))
      ).toBeInTheDocument();
      expect(screen.getByAltText(MAIN_PRODUCT.name)).toHaveAttribute(
        "src",
        `/api/v1/product/product-photo/${MAIN_PRODUCT._id}`
      );
      expect(
        screen.getByRole("button", { name: /add to cart/i })
      ).toBeInTheDocument();
    });

    it("renders placeholder image if product has no _id", async () => {
      axios.get.mockResolvedValueOnce({
        data: { product: { ...MAIN_PRODUCT, _id: undefined } },
      });

      renderWithRouter("/product/no-id");
      const img = await screen.findByAltText(MAIN_PRODUCT.name);
      expect(img).toHaveAttribute("src", "/images/placeholder.png");
    });

    it("falls back to placeholder image if image load fails", async () => {
      axios.get.mockResolvedValueOnce({
        data: { product: { ...MAIN_PRODUCT, name: "Broken Image Product" } },
      });

      renderWithRouter("/product/broken-img");
      const img = await screen.findByAltText("Broken Image Product");
      fireEvent.error(img);
      expect(img).toHaveAttribute("src", "/images/placeholder.png");
    });
  });

  // Similar Products
  describe("Similar products", () => {
    it("renders similar products correctly", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: MAIN_PRODUCT } })
        .mockResolvedValueOnce({
          data: { products: [SIMILAR_PRODUCT_1, SIMILAR_PRODUCT_2] },
        });

      renderWithRouter();

      expect(
        await screen.findByText(new RegExp(SIMILAR_PRODUCT_1.name))
      ).toBeInTheDocument();
      expect(
        await screen.findByText(new RegExp(SIMILAR_PRODUCT_2.name))
      ).toBeInTheDocument();
    });

    it("shows 'No similar products found' if list is empty", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: MAIN_PRODUCT } })
        .mockResolvedValueOnce({ data: { products: [] } });

      renderWithRouter();
      expect(
        await screen.findByText(/No similar products found/i)
      ).toBeInTheDocument();
    });

    it("navigates to similar product details on click", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: MAIN_PRODUCT } })
        .mockResolvedValueOnce({ data: { products: [SIMILAR_PRODUCT_1] } });

      renderWithRouter();
      fireEvent.click(await screen.findByText("More Details"));
      expect(mockNavigate).toHaveBeenCalledWith(
        `/product/${SIMILAR_PRODUCT_1.slug}`
      );
    });
  });

  it("should add product to cart and show success toast if not already in cart", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "123",
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            category: { _id: "cat1", name: "Electronics" },
          },
        },
      })
      .mockResolvedValueOnce({ data: { products: [] } });

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Test Product/)).toBeInTheDocument();

    const mainButton = screen.getByTestId("main-add-to-cart");
    fireEvent.click(mainButton);

    await waitFor(() =>
      expect(mockSetCart).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ _id: "123", name: "Test Product" }),
        ])
      )
    );

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "cart",
      expect.stringContaining("Test Product")
    );

    expect(toast.success).toHaveBeenCalledWith("Item added to cart");
  });

  it("should not add product to cart and show error toast if already in cart", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "existing",
            name: "Existing Product",
            description: "Already in cart",
            price: 80,
            category: { _id: "cat1", name: "Category" },
          },
        },
      })
      .mockResolvedValueOnce({ data: { products: [] } });

    render(
      <MemoryRouter initialEntries={["/product/existing-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText(/Existing Product/)).toBeInTheDocument();

    const mainButton = screen.getByTestId("main-add-to-cart");
    fireEvent.click(mainButton);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Item already in cart")
    );
    expect(mockSetCart).not.toHaveBeenCalled();
    expect(window.localStorage.setItem).not.toHaveBeenCalledWith(
      "cart",
      expect.stringContaining("Existing Product")
    );
  });

  it("should add related product to cart if not already in cart", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "123",
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            category: { _id: "cat1", name: "Electronics" },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          products: [
            {
              _id: "rel-1",
              name: "Related Product 1",
              description: "This is a related product",
              price: 50,
              category: { _id: "cat1", name: "Electronics" },
              slug: "related-product-1",
            },
          ],
        },
      });

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    const mainProductName = await screen.findByText(/Test Product/);
    expect(mainProductName).toBeInTheDocument();

    const similarSection = screen.getByTestId("similar-products");
    const relatedButton = within(similarSection).getByText(/ADD TO CART/i);
    fireEvent.click(relatedButton);

    await waitFor(() => {
      expect(mockSetCart).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ _id: "rel-1", name: "Related Product 1" }),
        ])
      );
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "cart",
      expect.stringContaining("Related Product 1")
    );
    expect(toast.success).toHaveBeenCalledWith("Item added to cart");
  });

  it("should not add related product to cart and show error toast if already in cart", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "123",
            name: "Test Product",
            description: "Main product",
            price: 100,
            category: { _id: "cat1", name: "Electronics" },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          products: [
            {
              _id: "existing",
              name: "Related Product 1",
              description: "Already in cart",
              price: 50,
              category: { _id: "cat1", name: "Electronics" },
              slug: "related-product-1",
            },
          ],
        },
      });

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for main product to render
    const mainProductName = await screen.findByText(/Test Product/);
    expect(mainProductName).toBeInTheDocument();

    // Find the related product button
    const similarSection = screen.getByTestId("similar-products");
    const relatedButton = within(similarSection).getByText(/ADD TO CART/i);

    // Click the related product button
    fireEvent.click(relatedButton);

    // Assert error toast and that cart / localStorage are not updated
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Item already in cart")
    );
    expect(mockSetCart).not.toHaveBeenCalled();
    expect(window.localStorage.setItem).not.toHaveBeenCalledWith(
      "cart",
      expect.stringContaining("Related Product 1")
    );
  });

  it("should not break if cart is initially empty", async () => {
    // Override mock for empty cart
    jest.doMock("../context/cart", () => ({
      useCart: () => [[], mockSetCart],
    }));

    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "123",
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            category: { _id: "cat1", name: "Electronics" },
          },
        },
      })
      .mockResolvedValueOnce({ data: { products: [] } });

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Test Product/)).toBeInTheDocument();

    const mainButton = screen.getByTestId("main-add-to-cart");
    fireEvent.click(mainButton);

    await waitFor(() =>
      expect(mockSetCart).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ _id: "123", name: "Test Product" }),
        ])
      )
    );

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "cart",
      expect.stringContaining("Test Product")
    );

    expect(toast.success).toHaveBeenCalledWith("Item added to cart");
  });
});
