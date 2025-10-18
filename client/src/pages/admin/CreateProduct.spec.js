import { test, expect } from "@playwright/test";
import path from "path";

// sample category data
const SAMPLE_CATEOGRIES = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Books" },
];

// status codes
const SUCCESS_STATUS = 200;
const INTERNAL_SERVER_ERROR_STATUS = 500;

test.describe("Create Category Page", () => {
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

    // go to the create-product page
    await page.goto("/dashboard/admin/create-product");

    // wait to be redirected
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
    await page.waitForURL("/dashboard/admin/create-product");
  });

  test("successfully render all UI elements", async ({ page }) => {
    // heading
    await expect(page.locator("h1")).toContainText("Create Product");

    // fields
    await expect(page.getByRole("main")).toContainText("Select a category");
    await expect(page.getByText("Upload Photo")).toBeVisible();
    await expect(page.getByPlaceholder("Write a name")).toBeVisible();
    await expect(page.getByPlaceholder("Write a description")).toBeVisible();
    await expect(page.getByPlaceholder("Write a Price")).toBeVisible();
    await expect(page.getByPlaceholder("Write a quantity")).toBeVisible();
    await expect(page.getByRole("main")).toContainText("Select Shipping");

    // button
    await expect(
      page.getByRole("button", { name: "CREATE PRODUCT" })
    ).toBeVisible();
  });

  test("should populate category dropdown and allow selection", async ({
    page,
  }) => {
    const selectCategory = page.locator(".ant-select-dropdown");

    // open dropdown
    await page.click(".ant-select");
    await expect(selectCategory).toBeVisible();

    // assert that existing categories are visible in the drop down
    await expect(
      selectCategory.getByText(SAMPLE_CATEOGRIES[0].name)
    ).toBeVisible();
    await expect(
      selectCategory.getByText(SAMPLE_CATEOGRIES[1].name)
    ).toBeVisible();

    // select "electronics" option
    await selectCategory.getByText(SAMPLE_CATEOGRIES[0].name).click();

    // verify "electronics" has been selected
    await expect(
      page.locator(".ant-select-selection-item", {
        hasText: SAMPLE_CATEOGRIES[0].name,
      })
    ).toBeVisible();
  });

  test("should show image preview after uploading image", async ({ page }) => {
    // test image
    const filePath = path.join(
      __dirname,
      "../../../public/images/placeholder.png"
    );

    // click 'upload photo' & input test image
    await page.getByText("Upload Photo").click();
    await page.locator('input[type="file"]').setInputFiles(filePath);

    // 'upload photo' button to now show the file's name
    await expect(page.getByText("placeholder.png")).toBeVisible();
    await expect(page.locator("label")).toContainText("placeholder.png");

    // preview is visible
    await expect(page.locator("img[alt='product_photo']")).toBeVisible();
  });

  test("empty form should return an error", async ({ page }) => {
    // leave form empty and submit
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

    // assert error toast
    await expect(page.getByRole("main")).toContainText("Something went wrong");
  });

  test("successfully create a product and navigates to products page", async ({
    page,
  }) => {
    // mock create product API
    await page.route("**/api/v1/product/create-product", async (route) => {
      await route.fulfill({
        status: SUCCESS_STATUS,
        body: JSON.stringify({ success: true }),
      });
    });

    // select "electronics" category
    const selectCategory = page.locator(".ant-select-dropdown");
    await page.click(".ant-select");
    await selectCategory.getByText(SAMPLE_CATEOGRIES[0].name).click();

    // fill in fields
    await page.getByRole("textbox", { name: "Write a name" }).click();
    await page
      .getByRole("textbox", { name: "Write a name" })
      .fill("Test Product");
    await page.getByRole("textbox", { name: "Write a description" }).click();
    await page
      .getByRole("textbox", { name: "Write a description" })
      .fill("Test Product Description");
    await page.getByPlaceholder("Write a Price").click();
    await page.getByPlaceholder("Write a Price").fill("100");
    await page.getByPlaceholder("Write a quantity").click();
    await page.getByPlaceholder("Write a quantity").fill("10");

    // select "no" shipping
    const selects = page.locator(".ant-select");
    await selects.nth(1).click();
    await page.getByText("No").click();

    // upload image
    const filePath = path.join(
      __dirname,
      "../../../public/images/placeholder.png"
    );
    await page.getByText("Upload Photo").click();
    await page.locator('input[type="file"]').setInputFiles(filePath);

    // submit
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

    // assert success toast
    await expect(page.getByRole("main")).toContainText(
      "Product Created Successfully"
    );

    // assert navigation
    await expect(page).toHaveURL(/\/dashboard\/admin\/products/);
  });

  test("should show error toast if API fails", async ({ page }) => {
    // mock POST route to fail
    await page.route("**/api/v1/product/create-product", async (route) => {
      await route.fulfill({
        status: INTERNAL_SERVER_ERROR_STATUS,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Server Error" }),
      });
    });

    // fill in only required fields
    const selectCategory = page.locator(".ant-select-dropdown");
    await page.click(".ant-select");
    await selectCategory.getByText(SAMPLE_CATEOGRIES[0].name).click();
    await page.click(".ant-select");
    await page.getByRole("textbox", { name: "Write a name" }).click();
    await page
      .getByRole("textbox", { name: "Write a name" })
      .fill("Broken Product");
    await page.getByRole("textbox", { name: "Write a description" }).click();
    await page
      .getByRole("textbox", { name: "Write a description" })
      .fill("This will fail");
    await page.getByPlaceholder("Write a Price").click();
    await page.getByPlaceholder("Write a Price").fill("1");
    await page.getByPlaceholder("Write a quantity").click();
    await page.getByPlaceholder("Write a quantity").fill("1");

    // submit
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

    // assert error toast
    await expect(page.getByRole("main")).toContainText("Something went wrong");
  });

  test("missing required fields should return an error", async ({ page }) => {
    // mock POST route to fail
    await page.route("**/api/v1/product/create-product", async (route) => {
      await route.fulfill({
        status: INTERNAL_SERVER_ERROR_STATUS,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Server Error" }),
      });
    });

    // partially fill out form (no price & quantity)
    const selectCategory = page.locator(".ant-select-dropdown");
    await page.click(".ant-select");
    await selectCategory.getByText(SAMPLE_CATEOGRIES[0].name).click();
    await page.click(".ant-select");
    await page.getByRole("textbox", { name: "Write a name" }).click();
    await page
      .getByRole("textbox", { name: "Write a name" })
      .fill("Half filled form's product");
    await page.getByRole("textbox", { name: "Write a description" }).click();
    await page
      .getByRole("textbox", { name: "Write a description" })
      .fill("Half filled form's description");

    // submit
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

    // assert error toast
    await expect(page.getByRole("main")).toContainText("Something went wrong");
  });
});
