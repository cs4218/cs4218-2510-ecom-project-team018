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
});
