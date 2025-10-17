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

    // mock photo preview retrieval
    const filePath = path.join(
      __dirname,
      "../../../public/images/placeholder.png"
    );
    const fs = require("fs");
    const imageBuffer = fs.readFileSync(filePath);

    await page.route("**/api/v1/product/product-photo/**", async (route) => {
      route.fulfill({
        status: 200,
        contentType: "image/png",
        body: imageBuffer,
      });
    });

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

  test("should load product and categories correctly", async ({ page }) => {
    // heading
    await expect(page.locator("h1")).toContainText("Update Product");

    // fields
    await expect(page.locator(".ant-select").first()).toHaveText(
      SAMPLE_PRODUCT.product.category.name
    );
    await expect(page.getByPlaceholder("write a name")).toHaveValue(
      SAMPLE_PRODUCT.product.name
    );
    await expect(page.getByPlaceholder("write a description")).toHaveValue(
      SAMPLE_PRODUCT.product.description
    );
    await expect(page.getByPlaceholder("write a Price")).toHaveValue(
      SAMPLE_PRODUCT.product.price
    );
    await expect(page.getByPlaceholder("write a quantity")).toHaveValue(
      SAMPLE_PRODUCT.product.quantity
    );
    await expect(page.locator(".ant-select").nth(1)).toHaveText("No");

    // upload photo button
    await expect(page.getByText("Upload Photo")).toBeVisible();
    // photo preview
    const previewImg = page.locator("img[alt='product_photo']");
    await expect(previewImg).toBeVisible();

    // buttons
    await expect(
      page.getByRole("button", { name: "UPDATE PRODUCT" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "DELETE PRODUCT" })
    ).toBeVisible();
  });
  //   test("successfully updates a product and navigates to products page", async ({
  //     page,
  //   }) => {});
  //   test("error when updating a product bc missing fields", async ({
  //     page,
  //   }) => {});
  //   test("error bc API fail", async ({ page }) => {});
  //   test("successfully delete a product", async ({ page }) => {});
});
