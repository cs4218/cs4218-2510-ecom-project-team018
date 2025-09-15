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

  it("should render 'No Such Product Found' when product does not exist", async () => {
    axios.get.mockRejectedValue({ response: { status: 404 } });
    render(
      <MemoryRouter initialEntries={["/product/non-existent-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/No Such Product Found./i)
    ).toBeInTheDocument();
  });

  it("should render error message when API call fails to fetch product", async () => {
    axios.get.mockRejectedValue(new Error("Network Error"));
    render(
      <MemoryRouter initialEntries={["/product/error-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Failed to load product details/i)
    ).toBeInTheDocument();
  });

  it("should render 'No Similar Products found' when API call fails", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "123",
            name: "Test Product",
            description: "This is a test product",
            price: 100,
            category: { _id: "cat1", name: "Test Category" },
            slug: "test-product",
          },
        },
      })
      .mockRejectedValueOnce(new Error("Network Error"));

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Test Product/)).toBeInTheDocument();
    expect(
      await screen.findByText(/No Similar Products found/i)
    ).toBeInTheDocument();
  });

  it("should render product details correctly if product exists", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/get-product/test-product") {
        return Promise.resolve({
          data: {
            product: {
              _id: "123",
              name: "Test Product",
              description: "This is a test product",
              price: 100,
              category: { _id: "cat1", name: "Test Category" },
              slug: "test-product",
            },
          },
        });
      } else if (url.startsWith("/api/v1/product/related-product")) {
        return Promise.resolve({ data: { products: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Product Details/i)).toBeInTheDocument();
    expect(await screen.findByText(/Test Product/)).toBeInTheDocument();
    expect(
      await screen.findByText(/This is a test product/)
    ).toBeInTheDocument();
    expect(await screen.findByText(/\$100.00/)).toBeInTheDocument();
    expect(await screen.findByText(/Test Category/)).toBeInTheDocument();
    const productImage = await screen.findByAltText("Test Product");
    expect(productImage).toBeInTheDocument();
    expect(productImage).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/123"
    );

    const addToCartButton = screen.getByRole("button", {
      name: /add to cart/i,
    });
    expect(addToCartButton).toBeInTheDocument();
  });

  it("should render placeholder image if product has no _id", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        product: {
          name: "Product Without ID",
          description: "No id here",
          price: 50,
          category: { _id: "cat1", name: "Category" },
          slug: "no-id-product",
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/product/no-id-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    const img = await screen.findByAltText("Product Without ID");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/placeholder.png");
  });

  it("should fall back to placeholder image on image load error", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        product: {
          _id: "123",
          name: "Broken Image Product",
          description: "Image should fail",
          price: 75,
          category: { _id: "cat1", name: "Category" },
          slug: "broken-img-product",
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/product/broken-img-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    const img = await screen.findByAltText("Broken Image Product");
    expect(img).toBeInTheDocument();

    // Simulate image load error
    fireEvent.error(img);

    expect(img).toHaveAttribute("src", "/images/placeholder.png");
  });

  it("should render similar products details correctly when available", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/get-product/test-product") {
        return Promise.resolve({
          data: {
            product: {
              _id: "123",
              name: "Test Product",
              description: "This is a test product",
              price: 100,
              category: { _id: "cat1", name: "Test Category" },
              slug: "test-product",
            },
          },
        });
      } else if (url.startsWith("/api/v1/product/related-product")) {
        return Promise.resolve({
          data: {
            products: [
              {
                _id: "456",
                name: "Similar Product 1",
                description: "This is a similar product 1",
                price: 50,
                slug: "similar-product-1",
              },
              {
                _id: "789",
                name: "Similar Product 2",
                description: "This is a similar product 2",
                price: 75,
                slug: "similar-product-2",
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Similar Product 1/)).toBeInTheDocument();
    expect(
      await screen.findByText(/This is a similar product 1/)
    ).toBeInTheDocument();
    expect(await screen.findByText(/\$50.00/)).toBeInTheDocument();

    expect(await screen.findByText(/Similar Product 2/)).toBeInTheDocument();
    expect(
      await screen.findByText(/This is a similar product 2/)
    ).toBeInTheDocument();
    expect(await screen.findByText(/\$75.00/)).toBeInTheDocument();
  });

  it("should render 'No Similar Products found' when there are no similar products", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/product/get-product/test-product") {
        return Promise.resolve({
          data: {
            product: {
              _id: "123",
              name: "Test Product",
              description: "This is a test product",
              price: 100,
              category: { _id: "cat1", name: "Test Category" },
              slug: "test-product",
            },
          },
        });
      } else if (url.startsWith("/api/v1/product/related-product")) {
        return Promise.resolve({ data: { products: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter initialEntries={["/product/test-product"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/No Similar Products found/i)
    ).toBeInTheDocument();
  });

  it("should navigate to related product details when button is clicked", async () => {
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
              _id: "456",
              name: "Related Product",
              description: "This is related",
              price: 50,
              slug: "related-product",
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

    const button = await screen.findByText("More Details");
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/product/related-product");
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
