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

  test("displays products for the selected category (1 page only)", async ({
    page,
  }) => {
    await createCategoryWithProducts({
      name: CATEGORY_NAME,
      slug: CATEGORY_SLUG,
      products: generateProductInputs(CATEGORY_NAME, DEFAULT_PAGE_SIZE - 1),
    });

    await page.goto(`/category/${CATEGORY_SLUG}`);

    const heading = page.getByRole("heading", {
      level: 4,
      name: new RegExp(`Category - ${CATEGORY_NAME}`),
    });
    await expect(heading).toBeVisible();

    const resultCountHeading = page.getByRole("heading", {
      level: 6,
      name: /results found/i,
    });
    await expect(resultCountHeading).toHaveText(
      new RegExp(`${DEFAULT_PAGE_SIZE - 1} result`)
    );

    const productCards = page.locator(".category .card").filter({
      has: page.locator(".card-body"),
    });
    await expect(productCards).toHaveCount(DEFAULT_PAGE_SIZE - 1);

    await expect(page.getByRole("button", { name: /load more/i })).toBeHidden();
  });

  test("displays paginated products for the selected category (>1 page)", async ({
    page,
  }) => {
    await createCategoryWithProducts({
      name: CATEGORY_NAME,
      slug: CATEGORY_SLUG,
      products: generateProductInputs(CATEGORY_NAME, MULTI_PAGE_PRODUCT_COUNT),
    });

    await page.goto(`/category/${CATEGORY_SLUG}`);

    const heading = page.getByRole("heading", {
      level: 4,
      name: new RegExp(`Category - ${CATEGORY_NAME}`),
    });
    await expect(heading).toBeVisible();

    const resultCountHeading = page.getByRole("heading", {
      level: 6,
      name: /results found/i,
    });
    await expect(resultCountHeading).toHaveText(
      new RegExp(`${MULTI_PAGE_PRODUCT_COUNT} result`)
    );

    const productCards = page.locator(".category .card").filter({
      has: page.locator(".card-body"),
    });
    await expect(productCards).toHaveCount(DEFAULT_PAGE_SIZE);

    const loadMoreButton = page.getByRole("button", { name: /load more/i });
    await expect(loadMoreButton).toBeEnabled();

    await loadMoreButton.click();

    await expect(productCards).toHaveCount(MULTI_PAGE_PRODUCT_COUNT);
    const productNameHeadings = productCards.locator(
      "h5.card-title:not(.card-price)"
    );
    await expect(productNameHeadings).toHaveCount(MULTI_PAGE_PRODUCT_COUNT);
    await expect(productNameHeadings.first()).toHaveText(
      `Electronics Product ${MULTI_PAGE_PRODUCT_COUNT}`
    );
    for (let i = 0; i < MULTI_PAGE_PRODUCT_COUNT; i++) {
      await expect(productNameHeadings.nth(i)).toHaveText(
        `Electronics Product ${MULTI_PAGE_PRODUCT_COUNT - i}`
      );
    }
  });

  test("shows empty state when a category has no products", async ({
    page,
  }) => {
    await createCategoryWithProducts({
      name: CATEGORY_NAME,
      slug: CATEGORY_SLUG,
      products: [],
    });

    await page.goto(`/category/${CATEGORY_SLUG}`);

    const heading = page.getByRole("heading", {
      level: 4,
      name: new RegExp(`Category - ${CATEGORY_NAME}`),
    });
    await expect(heading).toBeVisible();

    const emptyStateMessage = page.getByText(
      "No products found in this category."
    );
    await expect(emptyStateMessage).toBeVisible();

    const productCards = page.locator(".category .card").filter({
      has: page.locator(".card-body"),
    });
    await expect(productCards).toHaveCount(0);
  });

  test("removes Load more button after fetching all pages", async ({
    page,
  }) => {
    await createCategoryWithProducts({
      name: CATEGORY_NAME,
      slug: CATEGORY_SLUG,
      products: generateProductInputs(CATEGORY_NAME, MULTI_PAGE_PRODUCT_COUNT),
    });

    await page.goto(`/category/${CATEGORY_SLUG}`);

    const productCards = page.locator(".category .card").filter({
      has: page.locator(".card-body"),
    });
    const loadMoreButton = page.getByRole("button", { name: /load more/i });

    await expect(productCards).toHaveCount(DEFAULT_PAGE_SIZE);
    await loadMoreButton.click();
    await expect(productCards).toHaveCount(MULTI_PAGE_PRODUCT_COUNT);
    await expect(loadMoreButton).toBeHidden();
  });

  test("navigates to the product detail page from More Details button", async ({
    page,
  }) => {
    const { products } = await createCategoryWithProducts({
      name: CATEGORY_NAME,
      slug: CATEGORY_SLUG,
      products: generateProductInputs(CATEGORY_NAME, 3),
    });
    const targetProductIndex = 1;
    const targetProduct = products[targetProductIndex];

    await page.goto(`/category/${CATEGORY_SLUG}`);
    await page
      .getByRole("button", { name: "More Details" })
      .nth(targetProductIndex)
      .click();

    await expect(page).toHaveURL(
      new RegExp(`/product/${targetProduct.slug}`, "i")
    );
    await expect(
      page.getByRole("heading", { level: 1, name: /Product Details/i })
    ).toBeVisible();
    await expect(
      page.getByText(new RegExp(`Name : ${targetProduct.name}`, "i"))
    ).toBeVisible();
  });

  test("adds products to cart and prevents duplicates", async ({ page }) => {
    const { products } = await createCategoryWithProducts({
      name: CATEGORY_NAME,
      slug: CATEGORY_SLUG,
      products: generateProductInputs(CATEGORY_NAME, 1),
    });
    const targetProduct = products[0];

    await page.goto(`/category/${CATEGORY_SLUG}`);
    await page.evaluate(() => localStorage.clear());

    const addToCartButton = page.getByRole("button", { name: "ADD TO CART" });
    await addToCartButton.click();

    await expect(page.getByText("Item added to cart")).toBeVisible();

    const storedCart = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cart") || "[]")
    );
    expect(storedCart).toHaveLength(1);
    expect(storedCart[0]._id).toBe(String(targetProduct._id));

    await addToCartButton.click();
    await expect(page.getByText("Item already in cart")).toBeVisible();
  });

  test("falls back to placeholder image when product photo is missing", async ({
    page,
  }) => {
    await createCategoryWithProducts({
      name: CATEGORY_NAME,
      slug: CATEGORY_SLUG,
      products: generateProductInputs(CATEGORY_NAME, 1),
    });

    await page.goto(`/category/${CATEGORY_SLUG}`);

    await page.waitForFunction(() => {
      const img = document.querySelector(".category .card img");
      return img && img.getAttribute("src") === "/images/placeholder.png";
    });

    const cardImage = page.locator(".category .card img").first();
    await expect(cardImage).toHaveAttribute("src", "/images/placeholder.png");
  });

  test("shows error toasts when visiting non-existent category", async ({
    page,
  }) => {
    const missingSlug = "non-existent-category";
    await page.goto(`/category/${missingSlug}`);

    const errorToast = page.getByText(/Failed to load/i).first();
    await expect(errorToast).toBeVisible();
  });

  test("clears previous products when navigating to an empty category", async ({
    page,
  }) => {
    const populated = await createCategoryWithProducts({
      name: CATEGORY_NAME,
      slug: CATEGORY_SLUG,
      products: generateProductInputs(CATEGORY_NAME, 4),
    });
    const empty = await createCategoryWithProducts({
      name: "Empty Category",
      slug: "empty-category",
      products: [],
    });

    const productCards = page.locator(".category .card").filter({
      has: page.locator(".card-body"),
    });

    await page.goto(`/category/${populated.category.slug}`);
    await expect(productCards).toHaveCount(4);

    await page.goto(`/category/${empty.category.slug}`);
    await expect(productCards).toHaveCount(0);
    await expect(
      page.getByText("No products found in this category.")
    ).toBeVisible();
  });
});
