import {
  createProductController,
  deleteProductController,
} from "./productController.js";
import productModel from "../models/productModel.js";
import fs from "fs";
import slugify from "slugify";

/* mocks */
jest.mock("../models/productModel.js");
jest.mock("fs");

jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
  Environment: { Sandbox: "sandbox" },
}));

// sample data
const SAMPLE_PRODUCT = [
  {
    _id: "fake-product-id",
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

// status codes
const SUCCESS_STATUS = 200;
const CREATED_STATUS = 201;
const BAD_REQUEST_STATUS = 401;
const SERVER_ERROR_STATUS = 500;

describe("Product Controller - creating a product", () => {
  // fake server request and response
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      fields: { ...SAMPLE_PRODUCT[0] },
      files: { photo: { ...SAMPLE_PRODUCT[0].photo } },
    };

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
        ...SAMPLE_PRODUCT[0],
        slug: slugify(SAMPLE_PRODUCT[0].name),
      })
    );

    expect(fs.readFileSync).toHaveBeenCalledWith(SAMPLE_PRODUCT[0].photo.path);

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

    expect(res.status).toHaveBeenCalledWith(SERVER_ERROR_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Name is required" })
    );
  });

  test("return error when missing description field", async () => {
    req.fields.description = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(SERVER_ERROR_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Description is required" })
    );
  });

  test("return error when missing price field", async () => {
    req.fields.price = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(SERVER_ERROR_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Price is required" })
    );
  });

  test("return error when missing category field", async () => {
    req.fields.category = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(SERVER_ERROR_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Category is required" })
    );
  });

  test("return error when missing quantity field", async () => {
    req.fields.quantity = "";

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(SERVER_ERROR_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Quantity is required" })
    );
  });

  test("return error when photo file is >1MB", async () => {
    req.files.photo.size = 2000000; // 2MB

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(SERVER_ERROR_STATUS);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Photo is required and should be less then 1MB",
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
});
