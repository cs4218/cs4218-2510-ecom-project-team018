// Mock mongoose
jest.mock("mongoose", () => {
    return ({
        Schema: function () { return function(){}; },
        model: jest.fn(() => ({})),
        ObjectId: function () {},
        Types: { ObjectId: jest.fn() },
    });
});

import orderModel from "../models/orderModel.js";
import {
    braintreeTokenController,
    brainTreePaymentController,
} from "./productController.js";

// Mocks
jest.mock("../models/orderModel.js", () => ({
    __esModule: true,
    default: { create: jest.fn() },
}));

// braintree
jest.mock("braintree", () => {
    const generateMock = jest.fn();
    const saleMock = jest.fn();
    const Gateway = jest.fn().mockImplementation(() => ({
        clientToken: { generate: generateMock },
        transaction: { sale: saleMock },
    }));
    return {
        BraintreeGateway: Gateway,
        Environment: { Sandbox: "Sandbox" },
        __test__: { generateMock, saleMock },
    };
});

const {__test__ } = jest.requireMock("braintree");
const { generateMock, saleMock } = __test__;

// Helpers
let req, res;
beforeEach(() => {
    req = { body: {}, params: {}, fields: {}, files: {}, user: { _id: "u1" } };
    res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
        set: jest.fn(),
    };
    jest.clearAllMocks();
});

describe("braintreeTokenController", () => {
    test("returns generated client token", async () => {
        generateMock.mockImplementation((_, cb) => cb(null, { clientToken: "tok" }));

        await braintreeTokenController(req, res);

        expect(generateMock).toHaveBeenCalledWith({}, expect.any(Function));
        expect(res.send).toHaveBeenCalledWith({ clientToken: "tok", success: true });
    });

    test("handles gateway error", async () => {
        generateMock.mockImplementation((_, cb) => cb(new Error("fail"), null));

        await braintreeTokenController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalled();
    });
});

describe("brainTreePaymentController", () => {
    test("creates order on successful sale", async () => {
        req.body = {
            nonce: "fake-nonce",
            cart: [
                { _id: "a", price: 10 },
                { _id: "b", price: 2.5, quantity: 2 },
            ],
        };

        saleMock.mockImplementation((payload, cb) =>
            cb(null, { success: true, transaction: { id: "tr_1"} })
        );

        orderModel.create.mockResolvedValue({ _id: "order1" });

        await brainTreePaymentController(req, res);

        expect(saleMock).toHaveBeenCalledWith(
            {
                amount: "15.00",
                paymentMethodNonce: "fake-nonce",
                options: { submitForSettlement: true },
            },
          expect.any(Function)
        );
        expect(orderModel.create).toHaveBeenCalledWith({
            products: req.body.cart,
            payment: { success: true, transaction: { id: "tr_1" } },
            buyer: "u1",
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            ok: true ,
            transactionId: "tr_1",
            amount: "15.00",
        });
    });

    test("sends 400 when nonce is missing", async () => {
        req.body = { cart: [{ price: 10 }] };
        await brainTreePaymentController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Missing payment nonce or empty cart",
        });
    });

    test("sends 400 when cart is empty", async () => {
        req.body = { nonce: "x", cart: [] };
        await brainTreePaymentController(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Missing payment nonce or empty cart",
        });
    });

    test("sends 402 when processor declines the payment", async () => {
        req.body = { nonce: "n", cart: [{ price: 7 }] };
            saleMock.mockImplementation((payload, cb) =>
                cb(null, { success: false, message: "Declined" })
            );

        await brainTreePaymentController(req, res);

        expect(res.status).toHaveBeenCalledWith(402);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Payment failed",
            processorResponse: "Declined",
        });
        expect(orderModel.create).not.toHaveBeenCalled();
    });



    test("sends 500 when gateway sale throws", async () => {
        req.body = { nonce: "n", cart: [{ price: 1 }] };
        saleMock.mockImplementation((payload, cb) =>
            cb("gateway-error", null)
        );

        await brainTreePaymentController(req, res);

        expect(orderModel.create).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Payment error",
            error: expect.any(String),
        });
    });
});
