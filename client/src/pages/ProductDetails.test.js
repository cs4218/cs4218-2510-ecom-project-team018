import React from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  findByTestId,
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

jest.mock("../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));
jest.mock("../hooks/useCategory", () => jest.fn(() => []));

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: "test-product" }),
}));

jest.spyOn(console, "error").mockImplementation(() => {});

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

const mockProductApi = (product = MAIN_PRODUCT, related = []) => {
  axios.get
    .mockResolvedValueOnce({ data: { product } }) // Main product
    .mockResolvedValueOnce({ data: { products: related } }); // Related products
};

// Tests
describe("ProductDetails Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockReset();
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

    it("renders 'No Such Product Found' if product data is null", async () => {
      axios.get.mockResolvedValue({ data: { product: null } });
      renderWithRouter("/product/null-product");
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

    it("shows 'No similar products found' if similar products fetch fails", async () => {
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

    it("shows 'No similar products found' if similar products is null", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: MAIN_PRODUCT } })
        .mockResolvedValueOnce({ data: { products: null } });

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
      mockProductApi();

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
      mockProductApi({
        ...MAIN_PRODUCT,
        name: "Broken Image Product",
      });

      renderWithRouter("/product/broken-img");
      const img = await screen.findByAltText("Broken Image Product");
      fireEvent.error(img);
      expect(img).toHaveAttribute("src", "/images/placeholder.png");
    });

    it("renders placeholder values if product fields are missing", async () => {
      const incompleteProduct = {
        _id: "999",
        name: "",
        description: "",
        price: null,
        category: {},
        slug: "incomplete-product",
      };
      mockProductApi(incompleteProduct, []);

      renderWithRouter("/product/incomplete-product");

      expect(await screen.findByText(/No Name Available/i)).toBeInTheDocument();
      expect(
        await screen.findByText(/No Description Available/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/\$0.00/)).toBeInTheDocument();
      expect(screen.getByText(/Uncategorized/i)).toBeInTheDocument();
      const img = await screen.findByAltText(/Product/i);
      expect(img).toHaveAttribute("src", `/api/v1/product/product-photo/999`);
    });
  });

  // Similar Products
  describe("Similar products", () => {
    it("renders similar products correctly", async () => {
      mockProductApi(MAIN_PRODUCT, [SIMILAR_PRODUCT_1, SIMILAR_PRODUCT_2]);

      renderWithRouter();

      expect(
        await screen.findByText(new RegExp(SIMILAR_PRODUCT_1.name))
      ).toBeInTheDocument();
      expect(
        await screen.findByText(new RegExp(SIMILAR_PRODUCT_1.description))
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`\\$${SIMILAR_PRODUCT_1.price}.00`))
      ).toBeInTheDocument();
      expect(
        within(
          screen.getByTestId(`similar-product-${SIMILAR_PRODUCT_1._id}`)
        ).getByRole("button", { name: /add to cart/i })
      ).toBeInTheDocument();
      expect(
        within(
          screen.getByTestId(`similar-product-${SIMILAR_PRODUCT_1._id}`)
        ).getByRole("button", { name: /more details/i })
      ).toBeInTheDocument();

      expect(
        await screen.findByText(new RegExp(SIMILAR_PRODUCT_2.name))
      ).toBeInTheDocument();
      expect(
        await screen.findByText(new RegExp(SIMILAR_PRODUCT_2.description))
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`\\$${SIMILAR_PRODUCT_2.price}.00`))
      ).toBeInTheDocument();
      expect(
        within(
          screen.getByTestId(`similar-product-${SIMILAR_PRODUCT_2._id}`)
        ).getByRole("button", { name: /add to cart/i })
      ).toBeInTheDocument();
      expect(
        within(
          screen.getByTestId(`similar-product-${SIMILAR_PRODUCT_2._id}`)
        ).getByRole("button", { name: /more details/i })
      ).toBeInTheDocument();
    });

    it("shows 'No similar products found' if list is empty", async () => {
      mockProductApi(MAIN_PRODUCT, []);

      renderWithRouter();
      expect(
        await screen.findByText(/No similar products found/i)
      ).toBeInTheDocument();
    });

    it("navigates to similar product details on click", async () => {
      mockProductApi(MAIN_PRODUCT, [SIMILAR_PRODUCT_1]);

      renderWithRouter();
      fireEvent.click(await screen.findByText("More Details"));
      expect(mockNavigate).toHaveBeenCalledWith(
        `/product/${SIMILAR_PRODUCT_1.slug}`
      );
    });
  });

  // Cart Interactions
  describe("Cart interactions", () => {
    it("adds main product to cart if not already in cart", async () => {
      mockProductApi(MAIN_PRODUCT, []);

      renderWithRouter();

      fireEvent.click(await screen.findByTestId("main-add-to-cart"));
      await waitFor(() =>
        expect(mockSetCart).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ _id: MAIN_PRODUCT._id }),
          ])
        )
      );
      expect(toast.success).toHaveBeenCalledWith("Item added to cart");
    });

    it("prevents adding duplicate main product in cart", async () => {
      mockProductApi({
        ...MAIN_PRODUCT,
        _id: "existing",
      });

      renderWithRouter();
      fireEvent.click(await screen.findByTestId("main-add-to-cart"));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Item already in cart")
      );
      expect(mockSetCart).not.toHaveBeenCalled();
    });

    it("adds similar product to cart", async () => {
      mockProductApi(MAIN_PRODUCT, [SIMILAR_PRODUCT_1]);

      renderWithRouter();
      fireEvent.click(
        within(await screen.findByTestId("similar-products")).getByText(
          /add to cart/i
        )
      );

      await waitFor(() =>
        expect(mockSetCart).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ _id: SIMILAR_PRODUCT_1._id }),
          ])
        )
      );
      expect(toast.success).toHaveBeenCalledWith("Item added to cart");
    });

    it("prevents duplicate similar product in cart", async () => {
      mockProductApi(MAIN_PRODUCT, [{ ...SIMILAR_PRODUCT_1, _id: "existing" }]);

      renderWithRouter();
      fireEvent.click(
        within(await screen.findByTestId("similar-products")).getByText(
          /add to cart/i
        )
      );

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Item already in cart")
      );
      expect(mockSetCart).not.toHaveBeenCalled();
    });
  });
});
