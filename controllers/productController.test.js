import { getProductController } from "./productController.js";
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

describe("getProductController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
});
