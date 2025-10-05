import {
  formatPrice,
  getImageUrl,
  addToCart,
  handleImgError,
  truncateDescription30,
  truncateDescription60,
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

describe("truncateDescription helpers", () => {
  describe("truncateDescription30 (limit = 30)", () => {
    it("should return input unchanged for 29 characters (no ellipsis)", () => {
      const input = "a".repeat(29);

      const result = truncateDescription30(input);

      expect(result).toBe(input);
      expect(result.endsWith("...")).toBe(false);
    });

    it("should return input unchanged for exactly 30 characters (no ellipsis)", () => {
      const input = "a".repeat(30);

      const result = truncateDescription30(input);

      expect(result).toBe(input);
      expect(result.endsWith("...")).toBe(false);
    });

    it("should append ellipsis and keep first 30 chars for 31 characters", () => {
      const input = "a".repeat(31);
      const expected = "a".repeat(30) + "...";

      const result = truncateDescription30(input);

      expect(result).toBe(expected);
    });

    it("should return empty string unchanged for empty input", () => {
      const input = "";

      const result = truncateDescription30(input);

      expect(result).toBe(input);
      expect(result.endsWith("...")).toBe(false);
    });

    it("should handle null input gracefully", () => {
      const input = null;

      const result = truncateDescription30(input);

      expect(result).toBe("");
    });

    it("should handle missing input gracefully", () => {
      const result = truncateDescription30();

      expect(result).toBe("");
    });
  });

  describe("truncateDescription60 (limit = 60)", () => {
    it("should return input unchanged for 59 characters (no ellipsis)", () => {
      const input = "a".repeat(59);

      const result = truncateDescription60(input);

      expect(result).toBe(input);
      expect(result.endsWith("...")).toBe(false);
    });

    it("should return input unchanged for exactly 60 characters (no ellipsis)", () => {
      const input = "a".repeat(60);

      const result = truncateDescription60(input);

      expect(result).toBe(input);
      expect(result.endsWith("...")).toBe(false);
    });

    it("should append ellipsis and keep first 60 chars for 61 characters", () => {
      const input = "a".repeat(61);
      const expected = "a".repeat(60) + "...";

      const result = truncateDescription60(input);

      expect(result).toBe(expected);
    });

    it("should return empty string unchanged for empty input", () => {
      const input = "";

      const result = truncateDescription60(input);

      expect(result).toBe(input);
      expect(result.endsWith("...")).toBe(false);
    });

    it("should handle null input gracefully", () => {
      const input = null;

      const result = truncateDescription60(input);

      expect(result).toBe("");
    });

    it("should handle missing input gracefully", () => {
      const result = truncateDescription60();

      expect(result).toBe("");
    });
  });
});
