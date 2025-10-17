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
const INTERNAL_SERVER_ERROR = 500;

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

  test("successfully updates a product and navigates to products page", async ({
    page,
  }) => {
    // mock update-product API to return success
    await page.route("**/api/v1/product/update-product/**", async (route) => {
      await route.fulfill({
        status: SUCCESS_STATUS,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Product updated successfully",
        }),
      });
    });

    /*** update all fields ***/
    // change category
    await page.locator(".ant-select").first().click();
    await page.locator(".ant-select-dropdown").getByText("Books").click();
    // input fields
    await page.getByPlaceholder("write a name").fill("Updated Product");
    await page
      .getByPlaceholder("write a description")
      .fill("New description for product");
    await page.getByPlaceholder("write a Price").fill("80");
    await page.getByPlaceholder("write a quantity").fill("10");

    // upload new photo
    const filePath = path.join(__dirname, "../../../public/images/about.jpeg");
    await page.getByText("Upload Photo").click();
    await page.locator('input[type="file"]').setInputFiles(filePath);
    await expect(page.getByText("about.jpeg")).toBeVisible();

    // shipping
    const selects = page.locator(".ant-select");
    await selects.nth(1).click();
    await page.getByText("Yes").click();

    // submit
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

    // assert success toast
    await expect(page.getByText("Product updated successfully")).toBeVisible();

    // assert navigation
    await page.waitForURL("/dashboard/admin/products");
    await expect(page).toHaveURL("/dashboard/admin/products");
  });

  test("error when updating a product because of missing field(s)", async ({
    page,
  }) => {
    // mock update-product API to return error
    await page.route("**/api/v1/product/update-product/**", (route) =>
      route.fulfill({
        status: BAD_REQUEST_STATUS,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Name is required",
        }),
      })
    );

    // clear the product name
    const nameField = page.getByPlaceholder("write a name");
    await nameField.fill("");

    // submit
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

    // assert error toast
    await expect(page.getByText("Name is required")).toBeVisible();
  });

  test("shows error toast when API fails", async ({ page }) => {
    // mock the update-product API to return an internal server error (500)
    await page.route("**/api/v1/product/update-product/**", (route) =>
      route.fulfill({
        status: INTERNAL_SERVER_ERROR,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Something went wrong",
        }),
      })
    );

    // submit
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

    // assert error toast
    await expect(page.getByText("Something went wrong")).toBeVisible();
  });
  //   test("successfully delete a product", async ({ page }) => {});
});
