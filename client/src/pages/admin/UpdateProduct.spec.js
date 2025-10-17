import { test, expect } from "@playwright/test";
import path from "path";

// sample data
const SAMPLE_CATEOGRIES = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Books" },
];

const SAMPLE_PRODUCT = {
  product: {
    _id: "p123",
    name: "Test Product",
    description: "A sample description",
    price: "50",
    quantity: "5",
    shipping: false,
    category: SAMPLE_CATEOGRIES[0],
    slug: "test-product",
  },
};

// status codes
const SUCCESS_STATUS = 200;
const BAD_REQUEST_STATUS = 400;

test.describe("Update Product page", () => {
  test.beforeEach(async ({ page }) => {
    // mock get-category API
    await page.route("**/api/v1/category/get-category", async (route) => {
      await route.fulfill({
        status: SUCCESS_STATUS,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          category: [...SAMPLE_CATEOGRIES],
        }),
      });
    });

    // mock get-product and return sample product
    await page.route("**/api/v1/product/get-product/**", (route) =>
      route.fulfill({
        status: SUCCESS_STATUS,
        contentType: "application/json",
        body: JSON.stringify(SAMPLE_PRODUCT),
      })
    );

    // go to the product page with mock slug
    await page.goto("/dashboard/admin/product/test-product");

    //  wait to be redirected
    await page.waitForURL("/login");

    // login
    await page
      .getByRole("textbox", { name: "Enter Your Email" })
      .fill("kenvynkwek@gmail.com");
    await page.getByRole("textbox", { name: "Enter Your Email" }).press("Tab");
    await page
      .getByRole("textbox", { name: "Enter Your Password" })
      .fill("password");
    await page.getByRole("button", { name: "LOGIN" }).click();

    // wait for redirect to create-product page
    await page.waitForURL("/dashboard/admin/product/test-product");
  });

  test("should load product and categories correctly", async ({ page }) => {});
  //   test("successfully updates a product and navigates to products page", async ({
  //     page,
  //   }) => {});
  //   test("error when updating a product bc missing fields", async ({
  //     page,
  //   }) => {});
  //   test("error bc API fail", async ({ page }) => {});
  //   test("successfully delete a product", async ({ page }) => {});
});
