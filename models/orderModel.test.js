import mongoose from "mongoose";
import Order from "./orderModel";


const MOCK_ORDER_DATA = {
    products: [
        new mongoose.Types.ObjectId(),
    ],
    payment: {
        success: true
    },
    buyer: new mongoose.Types.ObjectId(),
    status: "Processing",
};

describe("Order schema unit tests", () => {
    it("should validate a correct order", () => {
        const order = new Order(MOCK_ORDER_DATA);
        const error = order.validateSync();

        expect(error).toBeUndefined();
    })

    it("should fail validation when required fields are missing", () => {
        const order = new Order({});
        const error = order.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.payment).toBeDefined();
        expect(error.errors.buyer).toBeDefined();
        expect(error.errors.products).toBeDefined();
        // Status will be present since it has a Default Value
    })

    it("should fail when status is not in the possible status enum values", () => {
        const order = new Order({
            ...MOCK_ORDER_DATA,
            status: "UnknownStatus",
        });
        
        const error = order.validateSync();
        expect(error.errors.status).toBeDefined();
    })

    it("should fail when products array is empty", () => {
        const order = new Order({
            ...MOCK_ORDER_DATA,
            products: [],
        });

        const error = order.validateSync();
        expect(error.errors.products).toBeDefined();
        expect(error.errors.products.message).toBe("Order must contain at least one product.");
    })

    it("should fail when products contain invalid ObjectId", () => {
        const order = new Order({
            ...MOCK_ORDER_DATA,
            products: ["not-a-valid-objectid"],
        });
        const error = order.validateSync();
        expect(error.errors["products.0"]).toBeDefined();
    })

    it("should fail when payment.success is missing", () => {
        const order = new Order({
            ...MOCK_ORDER_DATA,
            payment: {},
        });
        const error = order.validateSync();
        expect(error.errors["payment.success"]).toBeDefined();
    });

    it("should fail when payment.success is not Boolean", () => {
        const order = new Order({
            ...MOCK_ORDER_DATA,
            payment: { success: "yes" },
        });
        const error = order.validateSync();
        expect(error.errors["payment.success"]).toBeDefined();
    });

    it("should fail when buyer is not an ObjectId", () => {
        const order = new Order({
            ...MOCK_ORDER_DATA,
            buyer: "12345",
        });
        const error = order.validateSync();
        expect(error.errors.buyer).toBeDefined();
    });
})