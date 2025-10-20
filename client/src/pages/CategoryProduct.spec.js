/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from "../../../tests/playwrightTest.js";
import slugify from "slugify";
import categoryModel from "../../../models/categoryModel.js";
import productModel from "../../../models/productModel.js";
import { DEFAULT_PAGE_SIZE } from "../../../controllers/productController.js";

const CATEGORY_NAME = "Electronics";
const CATEGORY_SLUG = "electronics";
const MULTI_PAGE_PRODUCT_COUNT = DEFAULT_PAGE_SIZE * 2;

const defaultProductFactory = (categoryName, index) => {
  const suffix = index + 1;
  return {
    name: `${categoryName} Product ${suffix}`,
    slug: slugify(`${categoryName}-product-${suffix}`, { lower: true }),
    description: `Auto-generated description for ${categoryName} product ${suffix}.`,
    price: 10 * suffix,
    quantity: 5,
    shipping: false,
  };
};

const generateProductInputs = (categoryName, count) => {
  return Array.from({ length: count }, (_, index) =>
    defaultProductFactory(categoryName, index)
  );
};

const createCategoryWithProducts = async ({
  name,
  slug,
  products = [],
} = {}) => {
  if (!name) {
    throw new Error("Category name is required to seed test data.");
  }

  const categorySlug = slug ?? slugify(name, { lower: true });

  const category = await categoryModel.create({
    name,
    slug: categorySlug,
  });

  if (!Array.isArray(products) || products.length === 0) {
    return { category, products: [] };
  }

  const preparedProducts = products.map((product, index) => {
    const fallback = defaultProductFactory(name, index);
    return {
      name: product?.name ?? fallback.name,
      slug: product?.slug ?? fallback.slug,
      description: product?.description ?? fallback.description,
      price: product?.price ?? fallback.price,
      quantity: product?.quantity ?? fallback.quantity,
      shipping: product?.shipping ?? fallback.shipping,
      category: category._id,
    };
  });

  const createdProducts = await productModel.insertMany(preparedProducts);

  return { category, products: createdProducts };
};

const resetCategoryProducts = async () => {
  await productModel.deleteMany({});
  await categoryModel.deleteMany({});
};

test.describe("Category Product page", () => {
  test.beforeEach(async () => {
    await resetCategoryProducts();
  });

  test.afterAll(async () => {
    await resetCategoryProducts();
  });
});
