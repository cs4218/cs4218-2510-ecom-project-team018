import { test, expect } from "@playwright/test";
import path from "path";

// sample category data
const SAMPLE_CATEOGRIES = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Books" },
];

// status codes
const SUCCESS_STATUS = 200;
const BAD_REQUEST_STATUS = 400;

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
});
