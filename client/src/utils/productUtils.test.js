import {
  formatPrice,
  getImageUrl,
  addToCart,
  handleImgError,
} from "./productUtils";
import toast from "react-hot-toast";

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe("formatPrice", () => {
  it("formats a number as currency", () => {
    expect(formatPrice(1234.56)).toBe("$1,234.56");
  });

  it("returns $0.00 if price is null/undefined", () => {
    expect(formatPrice(null)).toBe("$0.00");
    expect(formatPrice(undefined)).toBe("$0.00");
  });
});

describe("getImageUrl", () => {
  it("returns product photo URL if id is provided", () => {
    expect(getImageUrl("abc123")).toBe("/api/v1/product/product-photo/abc123");
  });

  it("returns placeholder URL if id is missing", () => {
    expect(getImageUrl(null)).toBe("/images/placeholder.png");
    expect(getImageUrl("")).toBe("/images/placeholder.png");
  });
});

describe("addToCart", () => {
  let setCartMock;
  let localStorageSetItemSpy;

  beforeEach(() => {
    setCartMock = jest.fn();
    localStorageSetItemSpy = jest.spyOn(
      window.localStorage.__proto__,
      "setItem"
    );
    localStorageSetItemSpy.mockClear();
    jest.clearAllMocks();
  });

  it("adds product to cart if not already present", () => {
    const cart = [{ _id: "1" }];
    const product = { _id: "2", name: "Test Product" };

    const result = addToCart(cart, setCartMock, product);

    expect(result).toBe(true);
    expect(setCartMock).toHaveBeenCalledWith([...cart, product]);
    expect(localStorageSetItemSpy).toHaveBeenCalledWith(
      "cart",
      JSON.stringify([...cart, product])
    );
    expect(toast.success).toHaveBeenCalledWith("Item added to cart");
  });

  it("does not add product if already in cart", () => {
    const cart = [{ _id: "1" }];
    const product = { _id: "1", name: "Duplicate Product" };

    const result = addToCart(cart, setCartMock, product);

    expect(result).toBe(false);
    expect(setCartMock).not.toHaveBeenCalled();
    expect(localStorageSetItemSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Item already in cart");
  });
});

describe("handleImgError", () => {
  it("sets target.src to placeholder on error", () => {
    const mockEvent = { target: { src: "bad.jpg" } };
    handleImgError(mockEvent);
    expect(mockEvent.target.src).toBe("/images/placeholder.png");
  });
});
