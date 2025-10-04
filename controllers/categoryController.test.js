import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";
import {
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
  categoryController,
  singleCategoryController,
} from "./categoryController.js";

// sample data
const CATEGORY_ID_0 = "123abc";
const CATEGORY_NAME_0 = "Electronics";
const CATEGORY_SLUG_0 = "electronics";

const CATEGORY_ID_1 = "456def";
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

// fake server request and response
let req, res;

beforeEach(() => {
  req = { body: {} };
  res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

  jest.clearAllMocks();
});

describe("Creating a category", () => {
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

describe("Updating a category", () => {
  test("successfully updating a category", async () => {
    /* arrange */
    req.body = { name: CATEGORY_NAME_0 };
    req.params = { id: CATEGORY_ID_0 };

    slugify.mockReturnValue(CATEGORY_SLUG_0);
    // mock 'findByIdAndUpdate' to return updated details
    categoryModel.findByIdAndUpdate.mockResolvedValue({
      _id: CATEGORY_ID_0,
      name: CATEGORY_NAME_0,
      slug: CATEGORY_SLUG_0,
    });

    /* act*/
    await updateCategoryController(req, res);

    /* assert */
    expect(slugify).toHaveBeenCalledWith(CATEGORY_NAME_0);
    expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      CATEGORY_ID_0,
      { name: CATEGORY_NAME_0, slug: CATEGORY_SLUG_0 },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(SUCCESS_STATUS);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Category updated successfully",
      category: {
        _id: CATEGORY_ID_0,
        name: CATEGORY_NAME_0,
        slug: CATEGORY_SLUG_0,
      },
    });
  });
});

describe("Deleting a category", () => {
  test("successfully deleting a category", async () => {
    req.params = { id: CATEGORY_ID_0 };
    categoryModel.findByIdAndDelete.mockResolvedValue({}); // returns nth bc deleted alr

    await deleteCategoryController(req, res);

    expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith(CATEGORY_ID_0);
    expect(res.status).toHaveBeenCalledWith(SUCCESS_STATUS);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Category deleted successfully",
    });
  });
});

describe("Getting all categories", () => {
  test("returns all categories", async () => {
    const items = [
      { _id: CATEGORY_ID_0, name: CATEGORY_NAME_0, slug: CATEGORY_SLUG_0 },
      { _id: CATEGORY_ID_1, name: CATEGORY_NAME_1, slug: CATEGORY_SLUG_1 },
    ];
    categoryModel.find.mockResolvedValue(items);

    await categoryController({}, res);

    expect(res.status).toHaveBeenCalledWith(SUCCESS_STATUS);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "All categories list",
      category: items,
    });
  });

  test("handles error when getting all categories", async () => {
    const err = new Error("db error");
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    categoryModel.find.mockRejectedValue(err);

    await categoryController({}, res);

    expect(logSpy).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(SERVER_ERROR_STATUS);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: err,
      message: "Error while getting all categories",
    });

    logSpy.mockRestore();
  });
});

describe("Getting single category", () => {
  test("returns single category by slug", async () => {
    const doc = { _id: CATEGORY_ID_0, name: CATEGORY_NAME_0, slug: CATEGORY_SLUG_0 };
    const req = { params: { slug: CATEGORY_SLUG_0 } };
    categoryModel.findOne.mockResolvedValue(doc);

    await singleCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: CATEGORY_SLUG_0 });
    expect(res.status).toHaveBeenCalledWith(SUCCESS_STATUS);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Get single category successfully",
      category: doc,
    });
  });

  test("handles error when getting single category", async () => {
    const err = new Error("query failed");
    const req = { params: { slug: "missing" } };
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    categoryModel.findOne.mockRejectedValue(err);

    await singleCategoryController(req, res);

    expect(logSpy).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(SERVER_ERROR_STATUS);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: err,
      message: "Error while getting single category",
    });

    logSpy.mockRestore();
  });
});
