import mongoose from "mongoose";
import Order from "./orderModel";


const MOCK_ORDER_DATA = {
    products: [
        new mongoose.Types.ObjectId(),
    ],
    payment: {
        success: True
    },
    buyer: new mongoose.Types.ObjectId(),
    status: "Processing",
};

describe("Order schema unit tests", () => {
    it("should validate a correct order", () => {
        const order = new Order(MOCK_ORDER_DATA);

    })
})