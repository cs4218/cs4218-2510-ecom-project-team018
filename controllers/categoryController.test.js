import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";
import { createCategoryController } from "./categoryController.js";

// sample data
const CATEGORY_NAME_0 = "Electronics";
const CATEGORY_SLUG_0 = "electronics";

const CATEGORY_NAME_1 = "Books";
const CATEGORY_SLUG_1 = "books";

// status codes
const SUCCESS_STATUS = 200;
const CREATED_STATUS = 201;
const BAD_REQUEST_STATUS = 401;
const SERVER_ERROR_STATUS = 500;

// mocks
jest.mock("../models/categoryModel.js"); // to not hit real database
jest.mock("slugify");

describe("Creating a category", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test("successfully create a category", async () => {
    /* arrange */
    req.body = { name: CATEGORY_NAME_1 };
    categoryModel.findOne.mockResolvedValue(null); // no existing category with the same name
    slugify.mockReturnValue(CATEGORY_SLUG_1);

    // mock saving into db
    const saveMock = jest
      .fn()
      .mockResolvedValue({ name: CATEGORY_NAME_1, slug: CATEGORY_SLUG_1 });
    categoryModel.mockImplementation(() => ({ save: saveMock }));

    /* act*/
    await createCategoryController(req, res);

    /* assert */
    expect(slugify).toHaveBeenCalledWith(CATEGORY_NAME_1);
    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(CREATED_STATUS);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "New category created",
      category: { name: CATEGORY_NAME_1, slug: CATEGORY_SLUG_1 },
    });
  });

  test("no name provided", async () => {
    req.body = {}; // no name

    await createCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST_STATUS);
    expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
  });

  test("category already exists", async () => {
    req.body = { name: CATEGORY_NAME_0 };
    categoryModel.findOne.mockResolvedValue({ name: CATEGORY_NAME_0 }); // 'find' returns category alr exists

    await createCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({
      name: CATEGORY_NAME_0,
    });
    expect(res.status).toHaveBeenCalledWith(SUCCESS_STATUS);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Category already exists",
    });
  });
});
