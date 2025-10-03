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
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_NUMBER,
} from "./productController.js";
import mongoose from "mongoose";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

// Module Mocks
jest.mock("../models/productModel.js");
jest.mock("../models/categoryModel.js");

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

      const req = createMockReq();

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

    beforeEach(() => {
      res = createMockRes();
    });

    it("returns photo when exists", async () => {
      const pid = "p1";
      const buf = Buffer.from([1, 2, 3]);
      productModel.findById.mockReturnValue(
        makeQuery({ _id: pid, photo: { data: buf, contentType: "image/png" } })
      ); // photo exists

      const req = createMockReq({ params: { pid } });

      await productPhotoController(req, res);

      expect(productModel.findById).toHaveBeenCalledWith(pid);
      expect(res.set).toHaveBeenCalledWith("Content-Type", "image/png");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(buf);
    });

    it("defaults content-type to image/jpeg when missing", async () => {
      const pid = "p2";
      const buf = Buffer.from([4, 5, 6]);
      productModel.findById.mockReturnValue(
        makeQuery({ _id: pid, photo: { data: buf } })
      ); // photo exists, but contentType missing

      const req = createMockReq({ params: { pid } });

      await productPhotoController(req, res);

      expect(productModel.findById).toHaveBeenCalledWith(pid);
      expect(res.set).toHaveBeenCalledWith("Content-Type", "image/jpeg");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(buf);
    });

    it("returns 404 when no photo found", async () => {
      const pid = "p1";
      productModel.findById.mockReturnValue(makeQuery({ _id: pid, photo: {} })); // no photo

      const req = createMockReq({ params: { pid } });

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles errors with 500", async () => {
      productModel.findById.mockImplementation(() => {
        throw new Error("Network error");
      });

      const req = createMockReq();

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productFiltersController", () => {
    let res;
    const categories = ["c1", "c2"];
    const priceRange = [40, 59];

    beforeEach(() => {
      res = createMockRes();
    });

    it("filters by categories and price range", async () => {
      const result = [{ _id: "p1" }];
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
      const result = [{ _id: "p1" }];
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
      const result = [{ _id: "p1" }];
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
      const result = [{ _id: "p1" }];
      productModel.find.mockReturnValue(makeQuery(result));

      const req = createMockReq({ body: { radio: ["abc", "def"] } }); // non-numeric price range

      await productFiltersController(req, res);

      // Falls back to no filters
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: result })
      );
    });

    it("handles no filters gracefully", async () => {
      const result = [];
      productModel.find.mockReturnValue(makeQuery(result));

      const req = createMockReq({ body: {} }); // no filters

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
    it("returns total count", async () => {
      const total = 42;

      productModel.estimatedDocumentCount.mockResolvedValueOnce(total);
      const req = createMockReq();
      const res = createMockRes();

      await productCountController(req, res);

      expect(productModel.estimatedDocumentCount).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ total: total })
      );
    });

    it("handles errors with 500", async () => {
      productModel.estimatedDocumentCount.mockImplementation(() => {
        throw new Error("Network error");
      });
      const req = createMockReq();
      const res = createMockRes();

      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productListController", () => {
    it("paginates by page param", async () => {
      const docs = [{ _id: "p1" }, { _id: "p2" }];
      const pageNumber = 3;

      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);
      const req = createMockReq({ params: { page: pageNumber } });
      const res = createMockRes();

      await productListController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
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
      const res = createMockRes();

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

      const req = createMockReq({ params: { page: "abc" } });
      const res = createMockRes();

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

      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);
      const req = createMockReq({ params: { page: pageNumber } });
      const res = createMockRes();

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
      const res = createMockRes();

      await productListController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("searchProductController", () => {
    it("returns [] for keyword with whitespaces only", async () => {
      const whitespaceKeyword = "   ";

      const req = createMockReq({ params: { keyword: whitespaceKeyword } });
      const res = createMockRes();

      await searchProductController(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
      expect(productModel.find).not.toHaveBeenCalled();
    });

    it("returns [] for empty string keyword", async () => {
      const emptyKeyword = "";
      const req = createMockReq({ params: { keyword: emptyKeyword } });
      const res = createMockRes();

      await searchProductController(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
      expect(productModel.find).not.toHaveBeenCalled();
    });

    it("searches by name/description", async () => {
      const searchKeyword = "phone";
      const result = [{ _id: "p" }];

      productModel.find.mockReturnValue(makeQuery(result));
      const req = createMockReq({ params: { keyword: searchKeyword } });
      const res = createMockRes();

      await searchProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: searchKeyword, $options: "i" } },
          { description: { $regex: searchKeyword, $options: "i" } },
        ],
      });
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it("handles errors with 500", async () => {
      const searchKeyword = "phone";

      productModel.find.mockImplementation(() => {
        throw new Error("Network error");
      });
      const req = createMockReq({ params: { keyword: searchKeyword } });
      const res = createMockRes();

      await searchProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("relatedProductController", () => {
    const mockProductId = "mockProductId";
    const mockCategoryId = "mockCategoryId";
    const mockParams = {
      pid: mockProductId,
      cid: mockCategoryId,
    };
    let isValidObjectIdSpy;

    beforeAll(() => {
      isValidObjectIdSpy = jest.spyOn(mongoose, "isValidObjectId");
    });

    afterAll(() => {
      isValidObjectIdSpy.mockRestore();
    });

    it("returns related products", async () => {
      mongoose.isValidObjectId.mockReturnValue(true);

      categoryModel.exists.mockResolvedValueOnce({
        _id: mockCategoryId,
      });
      productModel.findById.mockReturnValue(
        makeQuery({
          _id: mockProductId,
          category: mockCategoryId,
        })
      );

      const related = [{ _id: "x1" }, { _id: "x2" }];
      const relatedQuery = makeQuery(related);
      productModel.find.mockReturnValue(relatedQuery);

      const req = createMockReq({
        params: mockParams,
      });
      const res = createMockRes();

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

    it("returns 400 when pid or cid is missing", async () => {
      const req = createMockReq({ params: { pid: "pOnly" } }); // cid missing
      const res = createMockRes();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(productModel.find).not.toHaveBeenCalled();
      expect(categoryModel.exists).not.toHaveBeenCalled();
    });

    it("returns 400 when invalid ObjectId format", async () => {
      mongoose.isValidObjectId.mockReturnValue(false);
      const req = createMockReq({ params: { pid: "bad", cid: "alsoBad" } });
      const res = createMockRes();

      await relatedProductController(req, res);

      expect(mongoose.isValidObjectId).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(productModel.find).not.toHaveBeenCalled();
    });

    it("returns 404 when product not found", async () => {
      mongoose.isValidObjectId.mockReturnValue(true);

      // category exists
      categoryModel.exists.mockResolvedValueOnce({ _id: "cid" });
      // findById().select() chain returns null
      productModel.findById.mockReturnValue(makeQuery(null));

      const req = createMockReq({
        params: mockParams,
      });
      const res = createMockRes();

      await relatedProductController(req, res);

      expect(categoryModel.exists).toHaveBeenCalledWith({
        _id: mockParams.cid,
      });
      expect(productModel.findById).toHaveBeenCalledWith(mockParams.pid);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Product not found" })
      );
    });

    it("returns 404 when category not found", async () => {
      mongoose.isValidObjectId.mockReturnValue(true);

      // category missing
      categoryModel.exists.mockResolvedValueOnce(null);
      // product exists
      productModel.findById.mockReturnValue(
        makeQuery({ _id: "p1", category: mockCategoryId })
      );

      const req = createMockReq({
        params: mockParams,
      });
      const res = createMockRes();

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
      mongoose.isValidObjectId.mockReturnValue(true);

      categoryModel.exists.mockResolvedValueOnce({
        _id: mockCategoryId,
      });
      productModel.findById.mockReturnValue(
        makeQuery({ _id: "p1", category: mockCategoryId })
      );

      productModel.find.mockImplementation(() => {
        throw new Error("DB down");
      });

      const req = createMockReq({
        params: mockParams,
      });
      const res = createMockRes();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productCategoryController", () => {
    it("paginates by query params (page & limit) and returns products", async () => {
      const docs = [{ _id: "p1" }, { _id: "p2" }];
      const pageNumber = 3;
      const pageLimit = 5;

      categoryModel.findOne.mockReturnValue(
        makeQuery({ _id: "cat1", name: "C" })
      );
      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);

      const req = createMockReq({
        params: { slug: "c" },
        query: { page: pageNumber, limit: pageLimit },
      });
      const res = createMockRes();

      await productCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "c" });
      expect(productModel.find).toHaveBeenCalledWith({ category: "cat1" });
      expect(query.select).toHaveBeenCalledWith("-photo");
      expect(query.populate).toHaveBeenCalledWith("category");
      expect(query.limit).toHaveBeenCalledWith(pageLimit);
      expect(query.skip).toHaveBeenCalledWith((pageNumber - 1) * pageLimit);
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          category: expect.objectContaining({ _id: "cat1" }),
          products: docs,
          page: pageNumber,
          limit: pageLimit,
        })
      );
    });

    it("uses default page number and size when query params are missing", async () => {
      const docs = [{ _id: "pA" }];

      categoryModel.findOne.mockReturnValue(
        makeQuery({ _id: "cat1", name: "C" })
      );
      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);

      const req = createMockReq({ params: { slug: "c" } }); // no query.page / query.limit
      const res = createMockRes();

      await productCategoryController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({ category: "cat1" });
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

      categoryModel.findOne.mockReturnValue(
        makeQuery({ _id: "cat1", name: "C" })
      );
      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);

      const req = createMockReq({
        params: { slug: "c" },
        query: { page: "abc", limit: "xyz" },
      });
      const res = createMockRes();

      await productCategoryController(req, res);

      expect(query.skip).toHaveBeenCalledWith(0);
      expect(query.limit).toHaveBeenCalledWith(DEFAULT_PAGE_SIZE);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns an empty array gracefully", async () => {
      const docs = [];
      const pageNumber = 2;
      const pageLimit = 4;

      categoryModel.findOne.mockReturnValue(
        makeQuery({ _id: "cat1", name: "C" })
      );
      const query = makeQuery(docs);
      productModel.find.mockReturnValue(query);

      const req = createMockReq({
        params: { slug: "c" },
        query: { page: pageNumber, limit: pageLimit },
      });
      const res = createMockRes();

      await productCategoryController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({ category: "cat1" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          products: docs,
          page: pageNumber,
          limit: pageLimit,
        })
      );
    });

    it("returns 404 when category not found", async () => {
      // category missing
      categoryModel.findOne.mockReturnValue(makeQuery(null));

      const req = createMockReq({
        params: { slug: "unknown" },
        query: { page: 1, limit: 6 },
      });
      const res = createMockRes();

      await productCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "unknown" });
      // Should not query products if category not found
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
      // category exists, but product query throws error
      categoryModel.findOne.mockReturnValue(
        makeQuery({ _id: "cat1", name: "C" })
      );
      productModel.find.mockImplementation(() => {
        throw new Error("Network error");
      });

      const req = createMockReq({
        params: { slug: "c" },
        query: { page: DEFAULT_PAGE_NUMBER, limit: DEFAULT_PAGE_SIZE },
      });
      const res = createMockRes();

      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productCategoryCountController", () => {
    it("returns count for category", async () => {
      const count = 7;
      const shirtSlug = "shirts";
      const categoryId = "cat1";

      categoryModel.findOne.mockReturnValue(makeQuery({ _id: categoryId }));
      productModel.countDocuments.mockResolvedValueOnce(count);
      const req = createMockReq({ params: { slug: shirtSlug } });
      const res = createMockRes();

      await productCategoryCountController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: shirtSlug });
      expect(productModel.countDocuments).toHaveBeenCalledWith({
        category: categoryId,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ total: count })
      );
    });

    it("returns 404 when category is missing", async () => {
      categoryModel.findOne.mockReturnValue(makeQuery(null));
      const req = createMockReq({ params: { slug: "missing" } });
      const res = createMockRes();

      await productCategoryCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles errors with 500", async () => {
      categoryModel.findOne.mockImplementation(() => {
        throw new Error("Network error");
      });
      const req = createMockReq();
      const res = createMockRes();

      await productCategoryCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });
});
