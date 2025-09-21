import mongoose from "mongoose";
import Products from "./productModel.js";

const MOCK_PRODUCT_DATA = {
  name: "Test Product",
  slug: "test-product",
  description: "This is a test product",
  price: 100,
  category: new mongoose.Types.ObjectId(),
  quantity: 50,
  shipping: true,
};

describe("Product schema unit tests", () => {
  it("should validate a correct product", () => {
    const product = new Products(MOCK_PRODUCT_DATA);
    const error = product.validateSync();

    expect(error).toBeUndefined();
  });

  it("should fail validation when required fields are missing", () => {
    const product = new Products({}); // empty object
    const error = product.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.slug).toBeDefined();
    expect(error.errors.description).toBeDefined();
    expect(error.errors.price).toBeDefined();
    expect(error.errors.category).toBeDefined();
    expect(error.errors.quantity).toBeDefined();
    expect(error.errors.shipping).toBeDefined();
  });
});
