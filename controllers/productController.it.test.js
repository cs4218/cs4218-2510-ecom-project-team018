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

  describe("createProductController", () => {
    it("creates a product with persisted data", async () => {
      const category = await createCategory("Wearables");
      const req = createMockReq({
        fields: {
          name: "Smart Watch",
          description: "Tracks fitness metrics",
          price: 250,
          category: category._id.toString(),
          quantity: 20,
          shipping: "1",
        },
      });
      const res = createMockRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const payload = res.send.mock.calls[0][0];
      expect(payload.success).toBe(true);
      const saved = await productModel.findOne({
        slug: slugify("Smart Watch"),
      });
      expect(saved).not.toBeNull();
      expect(saved?.name).toBe("Smart Watch");
      expect(saved?.category.toString()).toBe(category._id.toString());
    });

    it("rejects missing name", async () => {
      const category = await createCategory("Audio");
      const req = createMockReq({
        fields: {
          description: "Premium headset",
          price: 120,
          category: category._id.toString(),
          quantity: 5,
          shipping: "1",
        },
      });
      const res = createMockRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is required",
      });
      const count = await productModel.countDocuments();
      expect(count).toBe(0);
    });
  });

  describe("getProductController", () => {
    it("returns the most recent products", async () => {
      const category = await createCategory("Books");
      await createProduct({ name: "Book A", category });
      await createProduct({ name: "Book B", category });
      const req = createMockReq();
      const res = createMockRes();

      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.products.length).toBe(2);
      expect(payload.countTotal).toBe(2);
    });
  });

  describe("getSingleProductController", () => {
    it("returns one product by slug", async () => {
      const product = await createProduct({ name: "Limited Edition" });
      const req = createMockReq({
        params: { slug: product.slug },
      });
      const res = createMockRes();

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.product._id.toString()).toBe(product._id.toString());
    });

    it("returns 404 when product missing", async () => {
      const req = createMockReq({
        params: { slug: "missing-product" },
      });
      const res = createMockRes();

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Product not found",
      });
    });
  });

  describe("updateProductController", () => {
    it("updates existing product fields", async () => {
      const product = await createProduct({ name: "Old Name" });
      const req = createMockReq({
        params: { pid: product._id.toString() },
        fields: {
          name: "New Name",
          description: "Updated description",
          price: 999,
          category: product.category.toString(),
          quantity: 15,
          shipping: "0",
        },
      });
      const res = createMockRes();

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const updated = await productModel.findById(product._id);
      expect(updated?.name).toBe("New Name");
      expect(updated?.slug).toBe(slugify("New Name"));
      expect(updated?.price).toBe(999);
      expect(updated?.description).toBe("Updated description");
    });
  });

  describe("deleteProductController", () => {
    it("removes an existing product", async () => {
      const product = await createProduct({ name: "Disposable Product" });
      const req = createMockReq({
        params: { pid: product._id.toString() },
      });
      const res = createMockRes();

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const remaining = await productModel.findById(product._id);
      expect(remaining).toBeNull();
    });
  });

  describe("productFiltersController", () => {
    it("filters by category and price range", async () => {
      const electronics = await createCategory("Electronics");
      const books = await createCategory("Books");
      const matched = await createProduct({
        name: "Gaming Console",
        price: 500,
        category: electronics._id,
      });
      await createProduct({
        name: "Novel",
        price: 40,
        category: books._id,
      });

      const req = createMockReq({
        body: {
          checked: [electronics._id.toString()],
          radio: [100, 800],
        },
      });
      const res = createMockRes();

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.products).toHaveLength(1);
      expect(payload.products[0]._id.toString()).toBe(matched._id.toString());
    });
  });

  describe("productCountController", () => {
    it("returns total product count", async () => {
      await createProduct({ name: "Item 1" });
      await createProduct({ name: "Item 2" });
      await createProduct({ name: "Item 3" });
      const req = createMockReq();
      const res = createMockRes();

      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.total).toBe(3);
    });
  });

  describe("productListController", () => {
    it("paginates products by the default page size", async () => {
      const category = await createCategory("Gadgets");
      const totalToCreate = DEFAULT_PAGE_SIZE + 1;
      for (let i = 0; i < totalToCreate; i += 1) {
        await createProduct({ name: `Gadget ${i}`, category });
      }
      const reqFirstPage = createMockReq({
        params: { page: "1" },
      });
      const resFirstPage = createMockRes();
      await productListController(reqFirstPage, resFirstPage);
      const firstPayload = resFirstPage.send.mock.calls[0][0];
      expect(firstPayload.products).toHaveLength(DEFAULT_PAGE_SIZE);

      const reqSecondPage = createMockReq({
        params: { page: "2" },
      });
      const resSecondPage = createMockRes();
      await productListController(reqSecondPage, resSecondPage);
      const secondPayload = resSecondPage.send.mock.calls[0][0];
      expect(secondPayload.products).toHaveLength(1);
    });
  });

  describe("searchProductController", () => {
    it("finds products by keyword", async () => {
      const match = await createProduct({ name: "Amazing Lamp" });
      await createProduct({ name: "Ordinary Chair" });
      const req = createMockReq({
        params: { keyword: "lamp" },
      });
      const res = createMockRes();

      await searchProductController(req, res);

      const results = res.json.mock.calls[0][0];
      expect(results).toHaveLength(1);
      expect(results[0]._id.toString()).toBe(match._id.toString());
    });
  });

  describe("relatedProductController", () => {
    it("returns other products from the same category", async () => {
      const sharedCategory = await createCategory("Photography");
      const primary = await createProduct({
        name: "Camera Body",
        category: sharedCategory._id,
      });
      const related = await createProduct({
        name: "Prime Lens",
        category: sharedCategory._id,
      });
      await createProduct({
        name: "Mic",
        category: await createCategory("Audio"),
      });

      const req = createMockReq({
        params: {
          pid: primary._id.toString(),
          cid: sharedCategory._id.toString(),
        },
      });
      const res = createMockRes();

      await relatedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.products).toHaveLength(1);
      expect(payload.products[0]._id.toString()).toBe(related._id.toString());
    });
  });

  describe("productCategoryController", () => {
    it("returns paginated products for a category", async () => {
      const category = await createCategory("Accessories");
      await createProduct({ name: "Case 1", category: category._id });
      await createProduct({ name: "Case 2", category: category._id });

      const req = createMockReq({
        params: { slug: category.slug },
        query: { page: "1", limit: "1" },
      });
      const res = createMockRes();
      await productCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.category._id.toString()).toBe(category._id.toString());
      expect(payload.products).toHaveLength(1);
      expect(payload.page).toBe(1);
      expect(payload.limit).toBe(1);
    });
  });
});
