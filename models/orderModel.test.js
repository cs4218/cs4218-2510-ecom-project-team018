import mongoose from "mongoose";
import Order from "./orderModel";

const MOCK_ORDER_DATA = {
  products: [new mongoose.Types.ObjectId()],
  payment: { success: true },
  buyer: new mongoose.Types.ObjectId(),
  status: "Processing",
};

describe("Order schema unit tests", () => {
  describe("Valid order", () => {
    it("should validate a correct order", () => {
      const order = new Order(MOCK_ORDER_DATA);
      const error = order.validateSync();
      expect(error).toBeUndefined();
    });
  });

  describe("Required fields", () => {
    it("should fail validation when required fields are missing", () => {
      const order = new Order({});
      const error = order.validateSync();

      expect(error).toBeDefined();

      // payment is required
      expect(error.errors.payment).toBeDefined();
      expect(error.errors.payment.kind).toBe("required");

      // buyer is required
      expect(error.errors.buyer).toBeDefined();
      expect(error.errors.buyer.kind).toBe("required");

      // products is required
      expect(error.errors.products).toBeDefined();
      expect(error.errors.products.kind).toBe("user defined");

      // status has default, so no error expected
      expect(error.errors.status).toBeUndefined();
    });
  });

  describe("Status field", () => {
    it("should fail when status is not in the possible status enum values", () => {
      const order = new Order({
        ...MOCK_ORDER_DATA,
        status: "UnknownStatus",
      });
      const error = order.validateSync();
      expect(error.errors.status).toBeDefined();
      expect(error.errors.status.kind).toBe("enum");
    });
  });

  describe("Products field", () => {
    it("should fail when products array is empty", () => {
      const order = new Order({ ...MOCK_ORDER_DATA, products: [] });
      const error = order.validateSync();
      expect(error.errors.products).toBeDefined();
      expect(error.errors.products.message).toBe("Order must contain at least one product.");
    });

    it("should fail when products contain invalid ObjectId", () => {
      const order = new Order({ ...MOCK_ORDER_DATA, products: ["not-a-valid-objectid"] });
      const error = order.validateSync();
      expect(error.errors["products.0"]).toBeDefined();
      expect(error.errors["products.0"].kind).toBe("[ObjectId]");
    });
  });

  describe("Payment field", () => {
    it("should fail when payment.success is missing", () => {
      const order = new Order({ ...MOCK_ORDER_DATA, payment: {} });
      const error = order.validateSync();
      expect(error.errors["payment.success"]).toBeDefined();
      expect(error.errors["payment.success"].kind).toBe("required");
    });
  });

  describe("Buyer field", () => {
    it("should fail when buyer is not an ObjectId", () => {
      const order = new Order({ ...MOCK_ORDER_DATA, buyer: "12345" });
      const error = order.validateSync();
      expect(error.errors.buyer).toBeDefined();
      expect(error.errors.buyer.kind).toBe("ObjectId");
    });
  });
});
