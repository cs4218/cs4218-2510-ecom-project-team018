import slugify from "slugify";
import {
  connectTestDB,
  clearDB,
  disconnectTestDB,
} from "../tests/mongoTestEnv.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import {
  createProductController,
  deleteProductController,
  getProductController,
  getSingleProductController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  relatedProductController,
  productCategoryController,
  productCategoryCountController,
  productPhotoController,
  updateProductController,
  checkInventoryController,
  DEFAULT_PAGE_SIZE,
} from "./productController.js";

// Prevent braintree initialisation during tests
jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({
    clientToken: { generate: jest.fn() },
    transaction: { sale: jest.fn() },
  })),
  Environment: { Sandbox: "Sandbox" },
}));

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

const createCategory = async (name = "Electronics") => {
  const slug = slugify(name, { lower: true });
  return categoryModel.create({ name, slug });
};

const createProduct = async (options = {}) => {
  const { category, ...rest } = options;
  const resolvedCategory = category
    ? category._id ?? category
    : (await createCategory())._id;
  const name = rest.name ?? "Sample Product";
  const defaults = {
    name,
    slug: rest.slug ?? slugify(name, { lower: true }),
    description: rest.description ?? "Sample description",
    price: rest.price ?? 100,
    quantity: rest.quantity ?? 10,
    shipping: rest.shipping ?? false,
    category: resolvedCategory,
  };
  return productModel.create({
    ...defaults,
    ...rest,
    category: resolvedCategory,
  });
};

describe("productController integration", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  beforeEach(async () => {
    await clearDB();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });
});
