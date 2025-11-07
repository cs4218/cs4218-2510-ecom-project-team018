import {
  getProductController,
  getSingleProductController,
  productPhotoController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  relatedProductController,
  productCategoryController,
  productCategoryCountController,
  braintreeTokenController,
  brainTreePaymentController,
  checkInventoryController,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_NUMBER,
  createProductController,
  deleteProductController,
  updateProductController,
} from "./productController.js";
import mongoose from "mongoose";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import fs from "fs";
import slugify from "slugify";

// Mocks
jest.mock("../models/productModel.js");
jest.mock("../models/categoryModel.js");
jest.mock("../models/orderModel.js");
jest.mock("fs");
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

const { __test__ } = jest.requireMock("braintree");
const { generateMock, saleMock } = __test__;

// Test Utilities

/**
 * Express response double.
 */
const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
});

/**
 * Express request double.
 */
const createMockReq = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  fields: {},
  files: {},
  ...overrides,
});

/**
 * Chainable Mongoose query stub
 */
const makeQuery = (value) => ({
  _value: value,
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  then: (resolve) => Promise.resolve(value).then(resolve),
  catch: (reject) => Promise.resolve(value).catch(reject),
});

// sample data
const CREATE_PRODUCT = [
  {
    name: "Test Product",
    description: "Nice product",
    price: 100,
    category: "Electronics",
    quantity: 10,
    shipping: true,
    photo: {
      path: "fake/path/photo.jpg",
      type: "image/jpeg",
      size: 500000,
    },
  },
];

const SAMPLE_PRODUCT = [
  {
    _id: "690dab11199855311bf77191",name: "Test Product",
    description: "Nice product",
    price: 100,
    category: "Electronics",
    quantity: 10,
    shipping: true,
    photo: {
      path: "fake/path/photo.jpg",
      type: "image/jpeg",
      size: 500000,
    },
  },
];

// status codes
const SUCCESS_STATUS = 200;
const CREATED_STATUS = 201;
const BAD_REQUEST_STATUS = 400;
const PAYLOAD_TOO_LARGE_STATUS = 413;
const NOT_FOUND_STATUS = 404;

describe("Product controllers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProductController", () => {
    let res;

    beforeEach(() => {
      res = createMockRes();
    });

    it("returns 0 product successfully", async () => {
      const products = []; // no products
      productModel.find.mockReturnValue(makeQuery(products));

      const req = createMockReq();

      await getProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          products: expect.arrayContaining(products),
          countTotal: products.length,
        })
      );
    });

    it("returns 1 product successfully", async () => {
      const products = [{ _id: "p2" }]; // single product
      productModel.find.mockReturnValue(makeQuery(products));

      const req = createMockReq();

      await getProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          products: expect.arrayContaining(products),
          countTotal: products.length,
        })
      );
    });

    it("returns more than 1 products successfully", async () => {
      const products = [{ _id: "p1" }, { _id: "p2" }]; // multiple products
      productModel.find.mockReturnValue(makeQuery(products));

      const req = createMockReq();

      await getProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          products: expect.arrayContaining(products),
          countTotal: products.length,
        })
      );
    });

    it("handles errors with 500", async () => {
      productModel.find.mockImplementation(() => {
        throw new Error("Network error");
      });

      const req = createMockReq({_id: "690dbe5b71a9f84c9db8bc1d"});

      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("getSingleProductController", () => {
    let res;

    beforeEach(() => {
      res = createMockRes();
    });

    it("returns product successfully when found", async () => {
      const slug = "s";
      const doc = { _id: "p1", slug };
      productModel.findOne.mockReturnValue(makeQuery(doc)); // product found

      const req = createMockReq({ params: { slug } });

      await getSingleProductController(req, res);

      expect(productModel.findOne).toHaveBeenCalledWith({ slug });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          product: expect.objectContaining({ _id: "p1" }),
        })
      );
    });

    it("returns 404 when product not found", async () => {
      const slug = "missing";
      productModel.findOne.mockReturnValue(makeQuery(null)); // product not found

      const req = createMockReq({ params: { slug } });

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("handles errors with 500", async () => {
      productModel.findOne.mockImplementation(() => {
        throw new Error("Network error");
      });

      const req = createMockReq();

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productPhotoController", () => {
    let res;
    let req;
    let pid =  SAMPLE_PRODUCT[0]._id;

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    beforeEach(() => {
      req = {
        params: { pid: SAMPLE_PRODUCT[0]._id }
      };
    });

    it("returns photo when exists", async () => {
      const buf = Buffer.from([1, 2, 3]);
      productModel.findById.mockReturnValue(
        makeQuery({ _id: pid, photo: { data: buf, contentType: "image/png" } })
      ); // photo exists

      await productPhotoController(req, res);

      expect(productModel.findById).toHaveBeenCalledWith(req.params.pid);
      expect(res.set).toHaveBeenCalledWith("Content-Type", "image/png");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(buf);
    });

    it("defaults content-type to image/jpeg when missing", async () => {
      // Fix the PID to be a real MongoDB ID
      const buf = Buffer.from([4, 5, 6]);
      productModel.findById.mockReturnValue(
        makeQuery({ _id: pid, photo: { data: buf } })
      ); // photo exists, but contentType missing

      await productPhotoController(req, res);

      expect(productModel.findById).toHaveBeenCalledWith(req.params.pid);
      expect(res.set).toHaveBeenCalledWith("Content-Type", "image/jpeg");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(buf);
    });

    it("returns 404 when no photo found", async () => {
      productModel.findById.mockReturnValue(makeQuery({ _id: req.params.pid, photo: {} })); // no photo

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles errors with 500", async () => {
      productModel.findById.mockImplementation(() => {
        throw new Error("Network error");
      });

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productFiltersController", () => {
    let res;
    const categories = ["66db427fdb0119d9234b27ee", "68ee09f55d04c25ab1732ce9"];
    const priceRange = [40, 59];

    beforeEach(() => {
      res = createMockRes();
    });

    it("filters by categories and price range", async () => {
      const result = [{ _id: "68ee09f55d04c25ab1732ce9" }];
      productModel.find.mockReturnValue(makeQuery(result));

      const req = createMockReq({
        body: { checked: categories, radio: priceRange },
      });

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: { $in: categories },
        price: { $gte: priceRange[0], $lte: priceRange[1] },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: result })
      );
    });

    it("filters by categories only", async () => {
      const result = [{ _id: "68ee09f55d04c25ab1732ce9" }];
      productModel.find.mockReturnValue(makeQuery(result));

      const req = createMockReq({ body: { checked: categories } });

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: { $in: categories },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: result })
      );
    });

    it("filters by price range only", async () => {
      const result = [{ _id: "68ee09f55d04c25ab1732ce9" }];
      productModel.find.mockReturnValue(makeQuery(result));

      const req = createMockReq({ body: { radio: priceRange } });

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        price: { $gte: priceRange[0], $lte: priceRange[1] },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: result })
      );
    });

    it("does not filter by price for non-numeric price range", async () => {
      const result = [{ _id: "68ee09f55d04c25ab1732ce9" }];
      productModel.find.mockReturnValue(makeQuery(result));

      const req = createMockReq({ body: { radio: ["abc", "def"] } }); // non-numeric price range

      await productFiltersController(req, res);

      // Fail due to bad filter values
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("handles no filters gracefully", async () => {
      const result = [];
      productModel.find.mockReturnValue(makeQuery(result));

      const req = createMockReq({ body: {radio: [], checked: []} }); // no filters

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles errors with 500", async () => {
      productModel.find.mockImplementation(() => {
        throw new Error("Network error");
      });

      const req = createMockReq();

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productCountController", () => {
    let res;

    beforeEach(() => {
      res = createMockRes();
    });

    it("returns total count", async () => {
      const total = 42;
      productModel.estimatedDocumentCount.mockResolvedValueOnce(total);

      const req = createMockReq();

      await productCountController(req, res);

      expect(productModel.estimatedDocumentCount).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ total }));
    });

    it("handles errors with 500", async () => {
      productModel.estimatedDocumentCount.mockImplementation(() => {
        throw new Error("Network error");
      });

      const req = createMockReq();

      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productListController", () => {
    let res;

    beforeEach(() => {
      res = createMockRes();
    });

    it("paginates by page param", async () => {
      const docs = [{ _id: "p1" }, { _id: "p2" }];
      const pageNumber = 3;

      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);

      const req = createMockReq({ params: { page: pageNumber } });

      await productListController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
      expect(query.limit).toHaveBeenCalledWith(DEFAULT_PAGE_SIZE);
      expect(query.skip).toHaveBeenCalledWith(
        (pageNumber - 1) * DEFAULT_PAGE_SIZE
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: docs })
      );
    });

    it("uses default page number when param is missing", async () => {
      const docs = [{ _id: "pA" }];

      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);

      const req = createMockReq(); // no params.page

      await productListController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(query.skip).toHaveBeenCalledWith(DEFAULT_PAGE_NUMBER - 1);
      expect(query.limit).toHaveBeenCalledWith(DEFAULT_PAGE_SIZE);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: docs })
      );
    });

    it("defaults to page 1 for non-numeric page param", async () => {
      const docs = [{ _id: "pX" }];

      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);

      const req = createMockReq({ params: { page: "abc" } }); // non-numeric page

      await productListController(req, res);

      expect(query.skip).toHaveBeenCalledWith(
        (DEFAULT_PAGE_NUMBER - 1) * DEFAULT_PAGE_SIZE
      );
      expect(query.limit).toHaveBeenCalledWith(DEFAULT_PAGE_SIZE);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns an empty array gracefully", async () => {
      const docs = [];
      const pageNumber = 2;

      const query = makeQuery(docs); // no products
      productModel.find.mockReturnValue(query);

      const req = createMockReq({ params: { page: pageNumber } });

      await productListController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: docs })
      );
    });

    it("handles errors with 500", async () => {
      productModel.find.mockImplementation(() => {
        throw new Error("Network error");
      });

      const req = createMockReq();

      await productListController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("searchProductController", () => {
    let res;

    beforeEach(() => {
      res = createMockRes();
    });

    it("returns [] for keyword with whitespaces only", async () => {
      const keyword = "   "; // only spaces
      const req = createMockReq({ params: { keyword } });

      await searchProductController(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
      expect(productModel.find).not.toHaveBeenCalled();
    });

    it("returns [] for empty string keyword", async () => {
      const keyword = ""; // empty string
      const req = createMockReq({ params: { keyword } });

      await searchProductController(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
      expect(productModel.find).not.toHaveBeenCalled();
    });

    it("searches by name/description", async () => {
      const keyword = "phone";
      const result = [{ _id: "p" }];
      productModel.find.mockReturnValue(makeQuery(result));

      const req = createMockReq({ params: { keyword } });

      await searchProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      });
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it("handles errors with 500", async () => {
      const keyword = "phone";
      productModel.find.mockImplementation(() => {
        throw new Error("Network error");
      });

      const req = createMockReq({ params: { keyword } });

      await searchProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("relatedProductController", () => {
    // Common IDs for this suite
    const mockProductId = "mockProductId";
    const mockCategoryId = "mockCategoryId";
    const mockParams = { pid: mockProductId, cid: mockCategoryId };

    let res;
    let isValidObjectIdSpy;

    beforeEach(() => {
      res = createMockRes();
      // Default: treat IDs as valid unless a test overrides
      isValidObjectIdSpy = jest
        .spyOn(mongoose, "isValidObjectId")
        .mockReturnValue(true);
    });

    afterEach(() => {
      isValidObjectIdSpy.mockRestore();
    });

    it("returns related products", async () => {
      categoryModel.exists.mockResolvedValueOnce({ _id: mockCategoryId });
      productModel.findById.mockReturnValue(
        makeQuery({ _id: mockProductId, category: mockCategoryId })
      );

      const related = [{ _id: "x1" }, { _id: "x2" }];
      const relatedQuery = makeQuery(related);
      productModel.find.mockReturnValue(relatedQuery);

      const req = createMockReq({ params: mockParams });

      await relatedProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: mockCategoryId,
        _id: { $ne: mockProductId },
      });
      expect(relatedQuery.select).toHaveBeenCalledWith("-photo");
      expect(relatedQuery.limit).toHaveBeenCalledWith(3);
      expect(relatedQuery.populate).toHaveBeenCalledWith("category");

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, products: related })
      );
    });

    it("returns 400 when cid is missing", async () => {
      const req = createMockReq({ params: { pid: "pOnly" } }); // cid missing

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(productModel.find).not.toHaveBeenCalled();
      expect(categoryModel.exists).not.toHaveBeenCalled();
    });

    it("returns 400 when pid is missing", async () => {
      const req = createMockReq({ params: { cid: "cOnly" } }); // pid missing

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(productModel.find).not.toHaveBeenCalled();
      expect(categoryModel.exists).not.toHaveBeenCalled();
    });

    it("returns 400 when invalid ObjectId format", async () => {
      isValidObjectIdSpy.mockReturnValue(false);
      const req = createMockReq({ params: { pid: "bad", cid: "alsoBad" } }); // invalid IDs

      await relatedProductController(req, res);

      expect(mongoose.isValidObjectId).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(productModel.find).not.toHaveBeenCalled();
    });

    it("returns 404 when product not found", async () => {
      categoryModel.exists.mockResolvedValueOnce({ _id: mockCategoryId });
      productModel.findById.mockReturnValue(makeQuery(null)); // product missing

      const req = createMockReq({ params: mockParams });

      await relatedProductController(req, res);

      expect(categoryModel.exists).toHaveBeenCalledWith({
        _id: mockCategoryId,
      });
      expect(productModel.findById).toHaveBeenCalledWith(mockProductId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Product not found" })
      );
    });

    it("returns 404 when category not found", async () => {
      categoryModel.exists.mockResolvedValueOnce(null); // category missing
      productModel.findById.mockReturnValue(
        makeQuery({ _id: mockProductId, category: mockCategoryId })
      );

      const req = createMockReq({ params: mockParams });

      await relatedProductController(req, res);

      expect(productModel.findById).toHaveBeenCalledWith(mockProductId);
      expect(categoryModel.exists).toHaveBeenCalledWith({
        _id: mockCategoryId,
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Category not found" })
      );
    });

    it("handles errors with 500", async () => {
      categoryModel.exists.mockResolvedValueOnce({ _id: mockCategoryId });
      productModel.findById.mockReturnValue(
        makeQuery({ _id: mockProductId, category: mockCategoryId })
      );
      productModel.find.mockImplementation(() => {
        throw new Error("DB down");
      });

      const req = createMockReq({ params: mockParams });

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productCategoryController", () => {
    // Common params for this suite
    const slug = "c";
    const categoryDoc = { _id: "cat1", name: "C" };

    let res;

    beforeEach(() => {
      res = createMockRes();
    });

    it("paginates by query params (page & limit) and returns products", async () => {
      const docs = [{ _id: "p1" }, { _id: "p2" }];
      const page = 3;
      const limit = 5;

      categoryModel.findOne.mockReturnValue(makeQuery(categoryDoc));
      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);

      const req = createMockReq({ params: { slug }, query: { page, limit } });

      await productCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug });
      expect(productModel.find).toHaveBeenCalledWith({
        category: categoryDoc._id,
      });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect(query.populate).toHaveBeenCalledWith("category");
      expect(query.limit).toHaveBeenCalledWith(limit);
      expect(query.skip).toHaveBeenCalledWith((page - 1) * limit);
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          category: expect.objectContaining({ _id: categoryDoc._id }),
          products: docs,
          page,
          limit,
        })
      );
    });

    it("uses default page number and size when query params are missing", async () => {
      const docs = [{ _id: "pA" }];

      categoryModel.findOne.mockReturnValue(makeQuery(categoryDoc));
      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);

      const req = createMockReq({ params: { slug } }); // no query params

      await productCategoryController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: categoryDoc._id,
      });
      expect(query.skip).toHaveBeenCalledWith(
        (DEFAULT_PAGE_NUMBER - 1) * DEFAULT_PAGE_SIZE
      );
      expect(query.limit).toHaveBeenCalledWith(DEFAULT_PAGE_SIZE);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          products: docs,
          page: DEFAULT_PAGE_NUMBER,
          limit: DEFAULT_PAGE_SIZE,
        })
      );
    });

    it("defaults to page 1 & default limit for non-numeric query params", async () => {
      const docs = [{ _id: "pX" }];

      categoryModel.findOne.mockReturnValue(makeQuery(categoryDoc));
      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);

      const req = createMockReq({
        params: { slug },
        query: { page: "abc", limit: "xyz" }, // non-numeric params
      });

      await productCategoryController(req, res);

      expect(query.skip).toHaveBeenCalledWith(0);
      expect(query.limit).toHaveBeenCalledWith(DEFAULT_PAGE_SIZE);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns an empty array gracefully", async () => {
      const docs = [];
      const page = 2;
      const limit = 4;

      categoryModel.findOne.mockReturnValue(makeQuery(categoryDoc));
      const query = makeQuery(docs); // no products
      productModel.find.mockReturnValue(query);

      const req = createMockReq({ params: { slug }, query: { page, limit } });

      await productCategoryController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: categoryDoc._id,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          products: docs,
          page,
          limit,
        })
      );
    });

    it("returns 404 when category not found", async () => {
      categoryModel.findOne.mockReturnValue(makeQuery(null)); // category missing

      const req = createMockReq({
        params: { slug: "unknown" },
        query: { page: 1, limit: 6 },
      });

      await productCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "unknown" });
      expect(productModel.find).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Category not found",
        })
      );
    });

    it("handles errors with 500", async () => {
      categoryModel.findOne.mockReturnValue(makeQuery(categoryDoc));
      productModel.find.mockImplementation(() => {
        throw new Error("Network error");
      });

      const req = createMockReq({
        params: { slug },
        query: { page: DEFAULT_PAGE_NUMBER, limit: DEFAULT_PAGE_SIZE },
      });

      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productCategoryCountController", () => {
    // Common params for this suite
    const slug = "shirts";
    const categoryId = "cat1";

    let res;

    beforeEach(() => {
      res = createMockRes();
    });

    it("returns count for category", async () => {
      const count = 7;

      categoryModel.findOne.mockReturnValue(makeQuery({ _id: categoryId }));
      productModel.countDocuments.mockResolvedValueOnce(count);

      const req = createMockReq({ params: { slug } });

      await productCategoryCountController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug });
      expect(productModel.countDocuments).toHaveBeenCalledWith({
        category: categoryId,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ total: count })
      );
    });

    it("returns 404 when category is missing", async () => {
      categoryModel.findOne.mockReturnValue(makeQuery(null)); // category does not exist

      const req = createMockReq({ params: { slug: "missing" } });

      await productCategoryCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles errors with 500", async () => {
      categoryModel.findOne.mockImplementation(() => {
        throw new Error("Network error");
      });

      const req = createMockReq();

      await productCategoryCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("braintreeTokenController", () => {
    let req, res;

    beforeEach(() => {
      req = {
        body: {},
        params: {},
        fields: {},
        files: {},
        user: { _id: "u1" },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
        set: jest.fn(),
      };
      jest.clearAllMocks();
    });

    test("returns generated client token", async () => {
      generateMock.mockImplementation((_, cb) =>
        cb(null, { clientToken: "tok" })
      );

      await braintreeTokenController(req, res);

      expect(generateMock).toHaveBeenCalledWith({}, expect.any(Function));
      expect(res.send).toHaveBeenCalledWith({
        clientToken: "tok",
        success: true,
      });
    });

    test("handles gateway error", async () => {
      generateMock.mockImplementation((_, cb) => cb(new Error("fail"), null));

      await braintreeTokenController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe("brainTreePaymentController", () => {
    let req, res;
    beforeEach(() => {
      req = {
        body: {},
        params: {},
        fields: {},
        files: {},
        user: { _id: "u1" },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
        set: jest.fn(),
      };
      jest.clearAllMocks();
    });

    test("creates order on successful sale", async () => {
      req.body = {
        nonce: "fake-nonce",
        cart: [
          { _id: "a", price: 10 },
          { _id: "b", price: 2.5, quantity: 2 },
        ],
      };

      saleMock.mockImplementation((payload, cb) =>
        cb(null, { success: true, transaction: { id: "tr_1" } })
      );

      productModel.updateOne
        .mockResolvedValueOnce({ modifiedCount: 1 })
        .mockResolvedValueOnce({ modifiedCount: 1 });

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
        ok: true,
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
      saleMock.mockImplementation((payload, cb) => cb("gateway-error", null));

      await brainTreePaymentController(req, res);

      expect(orderModel.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Payment error"
      });
    });

    test("ignores invalid items when computing totalCents", async () => {
      req.body = {
        nonce: "n",
        cart: [
          { price: "nope", quantity: 2 }, // NaN price
          { price: 3.33, quantity: "x" }, // NaN quantity
          { price: -7, quantity: 1 }, // price < 0
          { price: 1, quantity: 0 }, // quantity <= 0
        ],
      };
      saleMock.mockImplementation((payload, cb) =>
        cb(null, { success: true, transaction: { id: "tr_0" } })
      );

      await brainTreePaymentController(req, res);

      expect(saleMock).toHaveBeenCalledWith(
        {
          amount: "0.00",
          paymentMethodNonce: "n",
          options: { submitForSettlement: true },
        },
        expect.any(Function)
      );
    });

    test("decrements stock for purchased items", async () => {
      req.body = {
        nonce: "n",
        cart: [
          { _id: "0", price: 10, quantity: 1 },
          { _id: "1", price: 5, quantity: 2 },
        ],
      };

      saleMock.mockImplementation((payload, cb) =>
        cb(null, { success: true, transaction: { id: "tr_ok" } })
      );

      productModel.updateOne
        .mockResolvedValueOnce({ modifiedCount: 1 })
        .mockResolvedValueOnce({ modifiedCount: 1 });

      orderModel.create.mockResolvedValue({ _id: "order_ok" });

      await brainTreePaymentController(req, res);

      expect(saleMock).toHaveBeenCalledWith(
        {
          amount: "20.00",
          paymentMethodNonce: "n",
          options: { submitForSettlement: true },
        },
        expect.any(Function)
      );
      expect(productModel.updateOne).toHaveBeenNthCalledWith(
        1,
        { _id: "0", quantity: { $gte: 1 } },
        { $inc: { quantity: -1 } }
      );
      expect(productModel.updateOne).toHaveBeenNthCalledWith(
        2,
        { _id: "1", quantity: { $gte: 2 } },
        { $inc: { quantity: -2 } }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        ok: true,
        transactionId: "tr_ok",
        amount: "20.00",
      });
    });

    test("returns 409 and rolls back previously decremented items when stock insufficient", async () => {
      req.body = {
        nonce: "n",
        cart: [
          { _id: "0", price: 10, quantity: 1 },
          { _id: "1", price: 5, quantity: 3 }, // this one will fail
        ],
      };

      saleMock.mockImplementation((payload, cb) =>
        cb(null, { success: true, transaction: { id: "tr_rollback" } })
      );

      // first decrement succeeds, second fails (insufficient stock)
      productModel.updateOne
        .mockResolvedValueOnce({ modifiedCount: 1 })
        .mockResolvedValueOnce({ modifiedCount: 0 });

      await brainTreePaymentController(req, res);

      // first two calls are the decrements
      expect(productModel.updateOne).toHaveBeenNthCalledWith(
        1,
        { _id: "0", quantity: { $gte: 1 } },
        { $inc: { quantity: -1 } }
      );
      expect(productModel.updateOne).toHaveBeenNthCalledWith(
        2,
        { _id: "1", quantity: { $gte: 3 } },
        { $inc: { quantity: -3 } }
      );

      // rollback call
      expect(productModel.updateOne).toHaveBeenNthCalledWith(
        3,
        { _id: "0" },
        { $inc: { quantity: 1 } }
      );
      expect(orderModel.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Insufficient quantity for one or more items",
          itemId: "1",
        })
      );
    });

    test("returns 500 when an unexpected error occurs during stock update", async () => {
      req.body = {
        nonce: "nonce",
        cart: [{ _id: "0", price: 10, quantity: 1 }],
      };

      saleMock.mockImplementation((payload, cb) =>
        cb(null, { success: true, transaction: { id: "tr_err" } })
      );

      productModel.updateOne.mockRejectedValue(new Error("db crash"));

      await brainTreePaymentController(req, res);

      expect(orderModel.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Stock update failed",
      });
    });
  });

  describe("checkInventoryController", () => {
    let res;

    beforeEach(() => {
      res = createMockRes();
      jest.clearAllMocks();
    });

    test("returns 400 for empty cart", async () => {
      const req = { body: { cart: [] } };

      await checkInventoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Empty cart",
      });
      expect(productModel.findById).not.toHaveBeenCalled();
    });

    test("returns 400 for bad cart item (missing _id)", async () => {
      const req = { body: { cart: [{ quantity: 2 }] } };

      await checkInventoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Bad cart item",
      });
      expect(productModel.findById).not.toHaveBeenCalled();
    });

    test("returns 400 for bad cart item (non-numeric or <=0 quantity)", async () => {
      const req = { body: { cart: [{ _id: "p1", quantity: "x" }] } };

      await checkInventoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Bad cart item",
      });
      expect(productModel.findById).not.toHaveBeenCalled();
    });

    test("returns 409 when product not found", async () => {
      // first item fails (no doc)
      productModel.findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(null),
      });

      const req = { body: { cart: [{ _id: "missing-id", quantity: 1 }] } };

      await checkInventoryController(req, res);

      expect(productModel.findById).toHaveBeenCalledWith("missing-id");
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Insufficient stock",
          itemId: "missing-id",
          available: 0,
        })
      );
    });

    test("returns 409 when quantity in DB is less than requested", async () => {
      // doc exists but not enough quantity
      productModel.findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({ _id: "p2", quantity: 1 }),
      });

      const req = { body: { cart: [{ _id: "p2", quantity: 3 }] } };

      await checkInventoryController(req, res);

      expect(productModel.findById).toHaveBeenCalledWith("p2");
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Insufficient stock",
          itemId: "p2",
          available: 1,
        })
      );
    });

    test("returns 200 when all items have sufficient stock (default qty=1)", async () => {
      // Two items: first requests 2, second omits quantity
      productModel.findById
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ _id: "a", quantity: 5 }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ _id: "b", quantity: 1 }),
        });

      const req = { body: { cart: [{ _id: "a", quantity: 2 }, { _id: "b" }] } };

      await checkInventoryController(req, res);

      expect(productModel.findById).toHaveBeenNthCalledWith(1, "a");
      expect(productModel.findById).toHaveBeenNthCalledWith(2, "b");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ success: true });
    });

    test("returns 500 on unexpected error", async () => {
      productModel.findById.mockImplementation(() => {
        throw new Error("DB down");
      });

      const req = { body: { cart: [{ _id: "x", quantity: 1 }] } };

      await checkInventoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Inventory check failed",
      });
    });
  });
});

describe("Product Controller - creating a product", () => {
  // fake server request and response
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      fields: { ...CREATE_PRODUCT[0] },
      files: { photo: { ...CREATE_PRODUCT[0].photo } },
    };

    // remove photo from fields (mutates)
    delete req.fields.photo

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    productModel.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(true),
      photo: {},
    }));

    fs.readFileSync.mockReturnValue(Buffer.from("fake-image"));
  });

  test("successfully create a product", async () => {
    await createProductController(req, res);

    expect(productModel).toHaveBeenCalledWith(
      expect.objectContaining({
        ...req.fields,
        slug: slugify(CREATE_PRODUCT[0].name),
      })
    );

    expect(fs.readFileSync).toHaveBeenCalledWith(CREATE_PRODUCT[0].photo.path);

    expect(res.status).toHaveBeenCalledWith(CREATED_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product created successfully",
        products: expect.any(Object),
      })
    );
  });

  test("return error when missing name field", async () => {
    req.fields.name = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Name is required" })
    );
  });

  test("return error when missing description field", async () => {
    req.fields.description = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Description is required" })
    );
  });

  test("return error when missing price field", async () => {
    req.fields.price = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Price is required" })
    );
  });

  test("return error when missing category field", async () => {
    req.fields.category = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Category is required" })
    );
  });

  test("return error when missing quantity field", async () => {
    req.fields.quantity = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Quantity is required" })
    );
  });

  test("return error when missing shipping field", async () => {
    req.fields.shipping = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Shipping is required",
      })
    );
  });

  test("return error when photo file is >1MB", async () => {
    req.files.photo.size = 2000000; // 2MB

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(PAYLOAD_TOO_LARGE_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Photo is required and should be less than 1MB",
      })
    );
  });
});

describe("Product Controller - deleting a product", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { pid: SAMPLE_PRODUCT[0]._id },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  test("successfully delete a product", async () => {
    productModel.findByIdAndDelete = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(true),
    });

    await deleteProductController(req, res);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(
      SAMPLE_PRODUCT[0]._id
    );
    expect(res.status).toHaveBeenCalledWith(SUCCESS_STATUS);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product deleted successfully",
    });
  });

  test("return 404 when product does not exist", async () => {
    productModel.findByIdAndDelete = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await deleteProductController(req, res);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith(
      SAMPLE_PRODUCT[0]._id
    );
    expect(res.status).toHaveBeenCalledWith(NOT_FOUND_STATUS);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });
});

describe("Product Controller - updating a product", () => {
  let req, res;
  let mockProductInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { pid: SAMPLE_PRODUCT[0]._id },
      fields: { ...SAMPLE_PRODUCT[0] },
      files: { photo: { ...SAMPLE_PRODUCT[0].photo } },
    };
    
    delete req.fields.photo
    delete req.fields._id

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    mockProductInstance = {
      ...SAMPLE_PRODUCT[0],
      save: jest.fn().mockResolvedValue(true),
      photo: {},
    };

    productModel.findByIdAndUpdate = jest
      .fn()
      .mockResolvedValue(mockProductInstance);

    fs.readFileSync.mockReturnValue(Buffer.from("fake-image"));
  });

  test("successfully updates a product", async () => {
    await updateProductController(req, res);

    expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
      SAMPLE_PRODUCT[0]._id,
      expect.objectContaining({
        ...req.fields,
        slug: slugify(SAMPLE_PRODUCT[0].name),
      }),
      { new: true }
    );

    expect(fs.readFileSync).toHaveBeenCalledWith(SAMPLE_PRODUCT[0].photo.path);

    expect(mockProductInstance.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(CREATED_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product updated successfully",
        products: mockProductInstance,
      })
    );
  });

  test("return error when missing name field", async () => {
    req.fields.name = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Name is required" })
    );
  });

  test("return error when missing description field", async () => {
    req.fields.description = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Description is required" })
    );
  });

  test("return error when missing price field", async () => {
    req.fields.price = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Price is required" })
    );
  });

  test("return error when missing category field", async () => {
    req.fields.category = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Category is required" })
    );
  });

  test("return error when missing quantity field", async () => {
    req.fields.quantity = "";

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Quantity is required" })
    );
  });

  it("return error when photo file is >1MB", async () => {
    req.files.photo.size = 2000000; // 2MB

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(PAYLOAD_TOO_LARGE_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Photo is required and should be less than 1MB",
      })
    );
  });

  test("return 404 when product does not exist", async () => {
    productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

    await updateProductController(req, res);

    expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
      SAMPLE_PRODUCT[0]._id,
      expect.objectContaining({
        ...req.fields,
        slug: slugify(SAMPLE_PRODUCT[0].name),
      }),
      { new: true }
    );

    expect(res.status).toHaveBeenCalledWith(NOT_FOUND_STATUS);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
    });
  });
});
