import React from "react";
import axios from "axios";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProductDetails from "./ProductDetails";

jest.mock("axios");
jest.mock("../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));
jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));
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
});
