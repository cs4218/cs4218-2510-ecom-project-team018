import {
  getProductController,
  getSingleProductController,
  productPhotoController,
  productFiltersController,
  productCountController,
  searchProductController,
  productCategoryCountController,
} from "./productController.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

// Mocks
jest.mock("../models/productModel.js");
jest.mock("../models/categoryModel.js");

// Helper functions
const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
});

const createMockReq = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  fields: {},
  files: {},
  ...overrides,
});

// Helper to create a mock query chain
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
    it("returns 0 product successfully", async () => {
      const mockProducts = [];
      productModel.find.mockReturnValue(makeQuery(mockProducts));
      const req = createMockReq();
      const res = createMockRes();

      await getProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          products: expect.arrayContaining(mockProducts),
          countTotal: mockProducts.length,
        })
      );
    });

    it("returns 1 product successfully", async () => {
      const mockProducts = [{ _id: "p2" }];
      productModel.find.mockReturnValue(makeQuery(mockProducts));
      const req = createMockReq();
      const res = createMockRes();

      await getProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          products: expect.arrayContaining(mockProducts),
          countTotal: mockProducts.length,
        })
      );
    });

    it("returns more than 1 products successfully", async () => {
      const mockProducts = [{ _id: "p1" }, { _id: "p2" }];
      productModel.find.mockReturnValue(makeQuery(mockProducts));
      const req = createMockReq();
      const res = createMockRes();

      await getProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          products: expect.arrayContaining(mockProducts),
          countTotal: mockProducts.length,
        })
      );
    });

    it("handles errors with 500", async () => {
      productModel.find.mockImplementation(() => {
        throw new Error("Network error");
      });
      const req = createMockReq();
      const res = createMockRes();

      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("getSingleProductController", () => {
    it("returns product successfully when found", async () => {
      productModel.findOne.mockReturnValue(makeQuery({ _id: "p1", slug: "s" }));
      const req = createMockReq({ params: { slug: "s" } });
      const res = createMockRes();

      await getSingleProductController(req, res);

      expect(productModel.findOne).toHaveBeenCalledWith({ slug: "s" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          product: expect.objectContaining({ _id: "p1" }),
        })
      );
    });

    it("returns 404 when product not found", async () => {
      productModel.findOne.mockReturnValue(makeQuery(null));
      const req = createMockReq({ params: { slug: "missing" } });
      const res = createMockRes();

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
      const res = createMockRes();

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productPhotoController", () => {
    it("returns photo when exists", async () => {
      const buf = Buffer.from([1, 2, 3]);
      productModel.findById.mockReturnValue(
        makeQuery({ _id: "p1", photo: { data: buf, contentType: "image/png" } })
      );
      const req = createMockReq({ params: { pid: "p1" } });
      const res = createMockRes();

      await productPhotoController(req, res);

      expect(productModel.findById).toHaveBeenCalledWith("p1");
      expect(res.set).toHaveBeenCalledWith("Content-Type", "image/png");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(buf);
    });

    it("returns 404 when no photo found", async () => {
      productModel.findById.mockReturnValue(
        makeQuery({ _id: "p1", photo: {} })
      );
      const req = createMockReq({ params: { pid: "p1" } });
      const res = createMockRes();

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("handles errors with 500", async () => {
      productModel.findById.mockImplementation(() => {
        throw new Error("Network error");
      });
      const req = createMockReq();
      const res = createMockRes();

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe("productFiltersController", () => {
    const categories = ["c1", "c2"];
    const priceRange = [40, 59];
    const result = [{ _id: "p1" }];

    it("filters by categories and price range", async () => {
      productModel.find.mockReturnValue(makeQuery(result));
      const req = createMockReq({
        body: { checked: categories, radio: priceRange },
      });
      const res = createMockRes();

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
      productModel.find.mockReturnValue(makeQuery(result));
      const req = createMockReq({
        body: { checked: categories },
      });
      const res = createMockRes();

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: { $in: categories },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: result })
      );
    });

    it("filters price range only", async () => {
      productModel.find.mockReturnValue(makeQuery(result));
      const req = createMockReq({
        body: { radio: priceRange },
      });
      const res = createMockRes();

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        price: { $gte: priceRange[0], $lte: priceRange[1] },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: result })
      );
    });

    it("does not filter by price when price range is NaN", async () => {
      productModel.find.mockReturnValue(makeQuery(result));
      const req = createMockReq({
        body: { radio: ["abc", "def"] },
      });
      const res = createMockRes();

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ products: result })
      );
    });

    it("handles no filters gracefully", async () => {
      const result = [];

      productModel.find.mockReturnValue(makeQuery(result));
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles errors with 500", async () => {
      productModel.find.mockImplementation(() => {
        throw new Error("Network error");
      });
      const req = createMockReq();
      const res = createMockRes();

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

    it("404 when category missing", async () => {
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
