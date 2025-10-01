import {
  getProductController,
  getSingleProductController,
  productPhotoController,
} from "./productController.js";
import productModel from "../models/productModel.js";

// Mocks
jest.mock("../models/productModel.js");

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
  });
});
