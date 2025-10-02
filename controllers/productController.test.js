// Mock mongoose
jest.mock("mongoose", () => {
    return ({
        Schema: function () { return function(){}; },
        model: jest.fn(() => ({})),
        ObjectId: function () {},
        Types: { ObjectId: jest.fn() },
    });
});

import fs from "fs";
import slugify from "slugify";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import {
    createProductController,
    getProductController,
    getSingleProductController,
    productPhotoController,
    deleteProductController,
    updateProductController,
    productFiltersController,
    productCountController,
    productListController,
    searchProductController,
    relatedProductController,
    productCategoryController,
    braintreeTokenController,
    brainTreePaymentController,
} from "./productController.js";

// Mocks
jest.mock("../models/productModel.js", () => jest.fn());
jest.mock("../models/categoryModel.js", () => jest.fn());
jest.mock("../models/orderModel.js", () => jest.fn());

jest.mock("fs");
jest.mock("slugify");
jest.mock("dotenv", () => ({ config: jest.fn() }));

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

const chainList = (items) => ({
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue(items),
});

const chainFindSelect = (items) => ({
    select: jest.fn().mockResolvedValue(items),
});

const chainFindPopulate = (items) => ({
    populate: jest.fn().mockResolvedValue(items),
});

const chainCount = (n) => ({
    estimatedDocumentCount: jest.fn().mockResolvedValue(n),
});

const chainListWithSkipLimit = (items) => ({
    select: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue(items),
});


describe("createProductController", () => {
    const baseFields = {
        name: "Phone X",
        description: "smartphone",
        price: 999,
        category: "Electronics",
        quantity: 3,
        shipping: true,
    };
    test.each([
        ["name", "Name is required"],
        ["description", "Description is required"],
        ["price", "Price is required"],
        ["category", "Category is required"],
        ["quantity", "Quantity is required"]
    ])("fails when missing required field: %s", async (missingKey, expectedMsg) => {
        req.fields = { ...baseFields };
        delete req.fields[missingKey];

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: expectedMsg });
    });

    test("rejects photo > 1MB", async () => {
        req.fields = {
            name: "Phone X",
            description: "smartphone",
            price: 999,
            category: "Electronics",
            quantity: 3,
            shipping: true,
        };
        req.files = { photo: { size: 2_000_000 } };
        await createProductController(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            error: "photo is required and should be less then 1MB",
        });
    });

    test("creates product (with photo)", async () => {
        req.fields = {
            name: "Phone X",
            description: "smartphone",
            price: 999,
            category: "Electronics",
            quantity: 3,
            shipping: true,
        };
        req.files = { photo: { size: 1000, path: "/tmp/p.png", type: "image/png" } };
        slugify.mockReturnValue("phone-x");
        fs.readFileSync.mockReturnValue(Buffer.from("image-bytes"));
        const savedDoc = {
            _id: "p0",
            name: "Phone X",
            slug: "phone-x",
            description: "smartphone",
            price: 999,
            category: "Electronics",
            quantity: 3,
            shipping: true,
            photo: { data: Buffer.from("image-bytes"), contentType: "image/png" },
        };
        const saveMock = jest.fn().mockResolvedValue(savedDoc);
        productModel.mockImplementation((doc) => ({
            save: saveMock,
            photo: { data: null, contentType: null },
        }));

        await createProductController(req, res);

        expect(slugify).toHaveBeenCalledWith("Phone X");
        expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/p.png");
        expect(saveMock).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Product created successfully",
                products: {
                    "photo": {
                        "contentType": "image/png",
                        "data": Buffer.from("image-bytes"),
                    },
                    "save": saveMock,
                },
            })
        );
    });
});

describe("getProductController", () => {
    test("returns list", async () => {
        const items = [
            { _id: "p0", name: "Phone X" },
            { _id: "p1", name: "Book Y" },
        ];
        productModel.find = jest.fn().mockReturnValue(chainList(items));

        await getProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            countTotal: items.length,
            message: "All products ",
            products: items,
        });
    });
});

describe("getSingleProductController", () => {
    test("returns single product by slug", async () => {
        const doc = { _id: "p0", slug: "phone-x", name: "Phone X" };
        req.params = { slug: "phone-x" };

        productModel.findOne = jest.fn().mockReturnValue(
            {
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockResolvedValue(doc),
            }
        );

        await getSingleProductController(req, res);

        expect(productModel.findOne).toHaveBeenCalledWith({ slug: "phone-x" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Single product fetched",
            product: doc,
        });
    });
});

describe("productPhotoController", () => {
    test("streams photo with correct content-type", async () => {
        req.params = { pid: "p0" };
        const doc = { photo: { data: Buffer.from("image-bytes"), contentType: "image/png" } };

        productModel.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(doc),
        });

        await productPhotoController(req, res);

        expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(Buffer.from("image-bytes"));
    });
});

describe("deleteProductController", () => {
    test("deletes product by id", async () => {
        req.params = { pid: "p0" };
        productModel.findByIdAndDelete = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({}),
        });

        await deleteProductController(req, res);

        expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("p0");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Product deleted successfully",
        });
    });
});

describe("updateProductController", () => {
    const baseFields = {
        name: "Phone X",
        description: "smartphone",
        price: 999,
        category: "Electronics",
        quantity: 3,
        shipping: true,
    };

    beforeEach(() => { req.params = { pid: "p0" } });

    test.each([
        ["name", "Name is required"],
        ["description", "Description is required"],
        ["price", "Price is required"],
        ["category", "Category is required"],
        ["quantity", "Quantity is required"]
    ])("fails when missing required field: %s", async (missingKey, expectedMsg) => {
        req.fields = { ...baseFields };
        delete req.fields[missingKey];

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: expectedMsg });
    });

    test("updates product and saves photo when provided", async () => {
        req.params = { pid: "p0" };
        req.fields = {
            name: "Book Y",
            description: "ebook",
            price: 99,
            category: "Books",
            quantity: 10,
            shipping: false,
        };
        req.files = { photo: { size: 512, path: "/tmp/k.png", type: "image/png" } };

        slugify.mockReturnValue("book-y");
        fs.readFileSync.mockReturnValue(Buffer.from("image-bytes"));

        const doc = {
            _id: "p0",
            save: jest.fn().mockResolvedValue(true),
            photo: { data: null, contentType: null },
        };
        productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(doc);

        await updateProductController(req, res);

        expect(slugify).toHaveBeenCalledWith("Book Y");
        expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "p0",
            { ...req.fields, slug: "book-y" },
            { new: true }
        );
        expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/k.png");
        expect(doc.save).toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Product updated successfully",
            products: doc,
        });
    });
});

describe("productFiltersController", () => {
    test("filters by category and price range", async () => {
        req.body = { checked: ["Electronics", "Books"], radio: [100, 500] };
        const items = [{ _id: "x" }, { _id: "y" }];
        productModel.find = jest.fn().mockResolvedValue(items);

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            category: ["Electronics", "Books"],
            price: { $gte: 100, $lte: 500 },
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({ success: true, products: items });
    });
});

describe("productCountController", () => {
    test("returns estimated document count", async () => {
        productModel.find = jest.fn().mockReturnValue(chainCount(42));

        await productCountController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({ success: true, total: 42 });
    });
});

describe("productListController", () => {
    test("returns page 1 with 6 per page by default", async () => {
        req.params = {};
        const items = Array.from({ length: 6 }, (_, i) => ({ _id: `p${i}` }));
        productModel.find = jest.fn().mockReturnValue(chainListWithSkipLimit(items));

        await productListController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({ success: true, products: items });
    });

    test("returns page 2", async () => {
        req.params = { page: 2 };
        const items = [{ _id: "p7" }, { _id: "p8" }];
        productModel.find = jest.fn().mockReturnValue(chainListWithSkipLimit(items));

        await productListController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({ success: true, products: items });
    });
});

describe("searchProductController", () => {
    test("regex search on name and description", async () => {
        req.params = { keyword: "apple" };
        const items = [{ _id: "pA" }, { _id: "pB" }];

        productModel.find = jest.fn().mockReturnValue(chainFindSelect(items));

        await searchProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: "apple", $options: "i" } },
                { description: { $regex: "apple", $options: "i" } },
            ],
        });
        expect(res.json).toHaveBeenCalledWith(items);
    });
});

describe("relatedProductController", () => {
    test("finds up to 3 products in same category excluding pid", async () => {
        req.params = { pid: "p0", cid: "c1" };
        const items = [{ _id: "z1" }, { _id: "z2" }];

        productModel.find = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockResolvedValue(items),
        });

        await relatedProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            category: "c1",
            _id: { $ne: "p0" },
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({ success: true, products: items });
    });
});

describe("productCategoryController", () => {
    test("gets products by category slug", async () => {
        req.params = { slug: "electronics" };
        categoryModel.findOne = jest.fn().mockResolvedValue({ _id: "c0", name: "Electronics" });

        const items = [{ _id: "pc1" }, { _id: "pc2" }];
        productModel.find = jest.fn().mockReturnValue(chainFindPopulate(items));

        await productCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
        expect(productModel.find).toHaveBeenCalledWith({ category: { _id: "c0", name: "Electronics" } });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            category: { _id: "c0", name: "Electronics" },
            products: items,
        });
    });
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
