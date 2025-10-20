/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from "../../../tests/playwrightTest.js";
import slugify from "slugify";
import categoryModel from "../../../models/categoryModel.js";
import productModel from "../../../models/productModel.js";
import userModel from "../../../models/userModel.js";
import { hashPassword } from "../../../helpers/authHelper.js";

const ADMIN_CREDENTIALS = {
  name: "Playwright Admin",
  email: "admin@example.com",
  password: "password",
  answer: "playwright",
};

const createCategory = async (name) => {
  const slug = slugify(name, { lower: true });
  return categoryModel.create({ name, slug });
};

const createProduct = async ({ name, slug, description, price, categoryId }) =>
  productModel.create({
    name,
    slug,
    description,
    price,
    category: categoryId,
    quantity: 10,
    shipping: false,
  });

const loginAsAdmin = async (page) => {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: /enter your email/i })
    .fill(ADMIN_CREDENTIALS.email);
  await page
    .getByRole("textbox", { name: /enter your password/i })
    .fill(ADMIN_CREDENTIALS.password);
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole("button", { name: /login/i }).click(),
  ]);
  await page.waitForLoadState("networkidle");
};

const resetDbAndSeedAdmin = async (page) => {
  await userModel.deleteMany({});
  await productModel.deleteMany({});
  await categoryModel.deleteMany({});

  await userModel.create({
    name: ADMIN_CREDENTIALS.name,
    email: ADMIN_CREDENTIALS.email,
    password: await hashPassword(ADMIN_CREDENTIALS.password),
    phone: "999-999-9999",
    address: "Playwright HQ",
    answer: ADMIN_CREDENTIALS.answer,
    role: 1,
  });

  await loginAsAdmin(page);
};

test.describe("Product Details page", () => {
  test.beforeEach(async ({ page }) => {
    await resetDbAndSeedAdmin(page);
  });

  test.afterAll(async () => {
    await userModel.deleteMany({});
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  test("displays main product information and image", async ({ page }) => {
    const category = await createCategory("Playwright Electronics");
    const product = await createProduct({
      name: "Playwright Primary Product",
      slug: "playwright-primary-product",
      description: "Playwright Primary Product description",
      price: 199.99,
      categoryId: category._id,
    });

    await page.goto(`/product/${product.slug}`);

    await expect(
      page.getByRole("heading", { level: 1, name: /product details/i })
    ).toBeVisible();
    await expect(
      page.getByText(new RegExp(`Name : ${product.name}`, "i"))
    ).toBeVisible();
    await expect(
      page.getByText(new RegExp(`Description : ${product.description}`, "i"))
    ).toBeVisible();
    await expect(
      page.getByText(new RegExp(`Price : \\$${product.price}`, "i"))
    ).toBeVisible();
    await expect(
      page.getByText(new RegExp(`Category : ${category.name}`, "i"))
    ).toBeVisible();

    const heroImage = page.getByRole("img", {
      name: new RegExp(product.name, "i"),
    });
    await expect(heroImage).toBeVisible();
    await expect(heroImage).toHaveAttribute(
      "src",
      /\/images\/placeholder\.png$/
    );
  });

  test("shows related products and supports navigation", async ({ page }) => {
    const category = await createCategory("Playwright Accessories");
    const mainProduct = await createProduct({
      name: "Accessory Bundle",
      slug: "playwright-accessory-bundle",
      description: "Accessory bundle description",
      price: 149.5,
      categoryId: category._id,
    });
    const relatedOne = await createProduct({
      name: "Accessory One",
      slug: "playwright-accessory-one",
      description: "Accessory one description",
      price: 59.99,
      categoryId: category._id,
    });
    await createProduct({
      name: "Accessory Two",
      slug: "playwright-accessory-two",
      description: "Accessory two description",
      price: 89.95,
      categoryId: category._id,
    });

    await page.goto(`/product/${mainProduct.slug}`);

    const similarSection = page.getByTestId("similar-products");
    await expect(
      similarSection.getByRole("heading", { name: /accessory one/i })
    ).toBeVisible();
    await expect(
      similarSection.getByRole("heading", { name: /accessory two/i })
    ).toBeVisible();

    await Promise.all([
      page.waitForURL(`**/product/${relatedOne.slug}`),
      similarSection
        .getByTestId(`similar-product-${relatedOne._id}`)
        .getByRole("button", { name: /more details/i })
        .click(),
    ]);

    await expect(page).toHaveURL(new RegExp(`/product/${relatedOne.slug}$`));
  });

  test("allows adding main product to cart", async ({ page }) => {
    const category = await createCategory("Cart Electronics");
    const product = await createProduct({
      name: "Cart Product",
      slug: "playwright-cart-product",
      description: "Cart product description",
      price: 49.99,
      categoryId: category._id,
    });

    await page.goto(`/product/${product.slug}`);
    await page.evaluate(() => localStorage.clear());

    await page.getByTestId("main-add-to-cart").click();

    await expect(page.getByText(/Item added to cart/i)).toBeVisible();
    const cart = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cart") || "[]")
    );
    expect(cart).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: product._id.toString() }),
      ])
    );
  });

  test("prevents duplicate addition of main product", async ({ page }) => {
    const category = await createCategory("Duplicate Guard");
    const product = await createProduct({
      name: "Duplicate Guard Product",
      slug: "playwright-duplicate-guard",
      description: "Duplicate guard description",
      price: 79.99,
      categoryId: category._id,
    });

    await page.goto(`/product/${product.slug}`);
    await page.evaluate(() => localStorage.clear());

    await page.getByTestId("main-add-to-cart").click();
    await expect(page.getByText(/Item added to cart/i)).toBeVisible();

    await page.getByTestId("main-add-to-cart").click();
    await expect(page.getByText(/Item already in cart/i)).toBeVisible();
  });

  test("adds related product to cart from similar section", async ({
    page,
  }) => {
    const category = await createCategory("Related Cart");
    const mainProduct = await createProduct({
      name: "Main Related",
      slug: "playwright-main-related",
      description: "Main related description",
      price: 159.99,
      categoryId: category._id,
    });
    const relatedProduct = await createProduct({
      name: "Related Cart Product",
      slug: "playwright-related-cart",
      description: "Related product description",
      price: 39.99,
      categoryId: category._id,
    });

    await page.goto(`/product/${mainProduct.slug}`);
    await page.evaluate(() => localStorage.clear());

    await page
      .getByTestId("similar-products")
      .getByTestId(`similar-product-${relatedProduct._id}`)
      .getByRole("button", { name: /add to cart/i })
      .click();

    await expect(page.getByText(/Item added to cart/i)).toBeVisible();
    const cart = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cart") || "[]")
    );
    expect(cart).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: relatedProduct._id.toString() }),
      ])
    );
  });
});
