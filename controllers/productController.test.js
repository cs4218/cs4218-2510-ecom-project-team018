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
jest.mock("../models/orderModel.js", () => jest.fn());

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
        expect(res.send).toHaveBeenCalledWith({ clientToken: "tok" });
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
                { _id: "b", price: 5 },
            ],
        };

        saleMock.mockImplementation((payload, cb) => cb(null, { id: "tr_1" }));

        const saveOrderMock = jest.fn().mockResolvedValue({});
        orderModel.mockImplementation(() => ({ save: saveOrderMock }));

        await brainTreePaymentController(req, res);

        expect(saleMock).toHaveBeenCalledWith(
            {
                amount: 15,
                paymentMethodNonce: "fake-nonce",
                options: { submitForSettlement: true },
            },
          expect.any(Function)
        );
        expect(saveOrderMock).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test("sends 500 on failed sale", async () => {
        req.body = { nonce: "n", cart: [{ price: 1 }] };
        saleMock.mockImplementation((payload, cb) =>
            cb("gateway-error", null)
        );

        await brainTreePaymentController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("gateway-error");
    });
});
