import { test, expect } from "../../../../tests/playwrightTest.js";
import path from "path";
import userModel from "../../../../models/userModel.js";
import categoryModel from "../../../../models/categoryModel.js";
import { hashPassword } from "../../../../helpers/authHelper.js";
import slugify from "slugify";

// sample category data
const SAMPLE_CATEGORIES = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Books" },
];

// admin test user credentials
const ADMIN_CREDENTIALS = {
  name: "Playwright Admin",
  email: "kenvynkwek@gmail.com",
  password: "password",
  phone: "12345678",
  address: "Playwright HQ",
  answer: "test",
  role: 1,
};

// seed an admin user that can log in through the UI
const seedAdminUser = async () => {
  const hashedPassword = await hashPassword(ADMIN_CREDENTIALS.password);
  await userModel.create({
    ...ADMIN_CREDENTIALS,
    password: hashedPassword,
  });
};

// seed baseline categories shown on first load
const seedCategories = async () => {
  const docs = SAMPLE_CATEGORIES.map((cat) => ({
    name: cat.name,
    slug: slugify(cat.name, { lower: true }),
  }));

  await categoryModel.insertMany(docs);
};

// logs into the app via the login page and waits for categories to load
const loginAsAdmin = async (page) => {
  // navigate to the target page; app should redirect to /login
  await page.goto("/dashboard/admin/create-product");

  // wait to be redirected
  await page.waitForURL("/login");

  // fill login form
  await page
    .getByRole("textbox", { name: "Enter Your Email" })
    .fill(ADMIN_CREDENTIALS.email);
  await page
    .getByRole("textbox", { name: "Enter Your Password" })
    .fill(ADMIN_CREDENTIALS.password);

  // submit
  await page.getByRole("button", { name: "LOGIN" }).click();

  // wait for redirect to create-category page
  await page.waitForURL("/dashboard/admin/create-product");

  // ensure category list request completes before assertions
  await page.waitForResponse((response) => {
    return (
      response.url().includes("/api/v1/category/get-category") && response.ok()
    );
  });
};

test.describe("Create Category Page", () => {
  test.beforeEach(async ({ page }) => {
    await userModel.deleteMany({});
    await categoryModel.deleteMany({});

    // seed an admin user and initial categories
    await seedAdminUser();
    await seedCategories();

    // log in and land on the page with data loaded
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await userModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  // test("successfully render all UI elements", async ({ page }) => {
  //   // heading
  //   await expect(page.locator("h1")).toContainText("Create Product");

  //   // fields
  //   await expect(page.getByRole("main")).toContainText("Select a category");
  //   await expect(page.getByText("Upload Photo")).toBeVisible();
  //   await expect(page.getByPlaceholder("Write a name")).toBeVisible();
  //   await expect(page.getByPlaceholder("Write a description")).toBeVisible();
  //   await expect(page.getByPlaceholder("Write a Price")).toBeVisible();
  //   await expect(page.getByPlaceholder("Write a quantity")).toBeVisible();
  //   await expect(page.getByRole("main")).toContainText("Select Shipping");

  //   // button
  //   await expect(
  //     page.getByRole("button", { name: "CREATE PRODUCT" })
  //   ).toBeVisible();
  // });

  // test("should populate category dropdown and allow selection", async ({
  //   page,
  // }) => {
  //   const selectCategory = page.locator(".ant-select-dropdown");

  //   // open dropdown
  //   await page.click(".ant-select");
  //   await expect(selectCategory).toBeVisible();

  //   // assert that existing categories are visible in the drop down
  //   await expect(
  //     selectCategory.getByText(SAMPLE_CATEGORIES[0].name)
  //   ).toBeVisible();
  //   await expect(
  //     selectCategory.getByText(SAMPLE_CATEGORIES[1].name)
  //   ).toBeVisible();

  //   // select "electronics" option
  //   await selectCategory.getByText(SAMPLE_CATEGORIES[0].name).click();

  //   // verify "electronics" has been selected
  //   await expect(
  //     page.locator(".ant-select-selection-item", {
  //       hasText: SAMPLE_CATEGORIES[0].name,
  //     })
  //   ).toBeVisible();
  // });

  // test("should show image preview after uploading image", async ({ page }) => {
  //   // test image
  //   const filePath = path.join(
  //     __dirname,
  //     "../../../public/images/placeholder.png"
  //   );

  //   // click 'upload photo' & input test image
  //   await page.getByText("Upload Photo").click();
  //   await page.locator('input[type="file"]').setInputFiles(filePath);

  //   // 'upload photo' button to now show the file's name
  //   await expect(page.getByText("placeholder.png")).toBeVisible();
  //   await expect(page.locator("label")).toContainText("placeholder.png");

  //   // preview is visible
  //   await expect(page.locator("img[alt='product_photo']")).toBeVisible();
  // });

  // test("missing name should return error message", async ({ page }) => {
  //   // leave form empty and submit
  //   await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

  //   // assert error toast
  //   await expect(page.getByRole("main")).toContainText(/name is required/i);
  // });

  // test("missing description should return error message", async ({ page }) => {
  //   // fill in product name
  //   await page
  //     .getByRole("textbox", { name: "Write a name" })
  //     .fill("Test Product");

  //   // submit
  //   await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

  //   // assert error toast
  //   await expect(page.getByRole("main")).toContainText(
  //     /description is required/i
  //   );
  // });

  test("missing price should return error message", async ({ page }) => {
    // fill in product name
    await page
      .getByRole("textbox", { name: "Write a name" })
      .fill("Test Product");
    // fill in product description
    await page
      .getByRole("textbox", { name: "Write a description" })
      .fill("Test Product Description");

    // submit
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

    // assert error toast
    await expect(page.getByRole("main")).toContainText(/price is required/i);
  });

  // test("successfully create a product and navigates to products page", async ({
  //   page,
  // }) => {
  //   // mock create product API
  //   await page.route("**/api/v1/product/create-product", async (route) => {
  //     await route.fulfill({
  //       status: SUCCESS_STATUS,
  //       body: JSON.stringify({ success: true }),
  //     });
  //   });

  //   // select "electronics" category
  //   const selectCategory = page.locator(".ant-select-dropdown");
  //   await page.click(".ant-select");
  //   await selectCategory.getByText(SAMPLE_CATEOGRIES[0].name).click();

  //   // fill in fields
  //   await page.getByRole("textbox", { name: "Write a name" }).click();
  //   await page
  //     .getByRole("textbox", { name: "Write a name" })
  //     .fill("Test Product");
  //   await page.getByRole("textbox", { name: "Write a description" }).click();
  //   await page
  //     .getByRole("textbox", { name: "Write a description" })
  //     .fill("Test Product Description");
  //   await page.getByPlaceholder("Write a Price").click();
  //   await page.getByPlaceholder("Write a Price").fill("100");
  //   await page.getByPlaceholder("Write a quantity").click();
  //   await page.getByPlaceholder("Write a quantity").fill("10");

  //   // select "no" shipping
  //   const selects = page.locator(".ant-select");
  //   await selects.nth(1).click();
  //   await page.getByText("No").click();

  //   // upload image
  //   const filePath = path.join(
  //     __dirname,
  //     "../../../public/images/placeholder.png"
  //   );
  //   await page.getByText("Upload Photo").click();
  //   await page.locator('input[type="file"]').setInputFiles(filePath);

  //   // submit
  //   await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

  //   // assert success toast
  //   await expect(page.getByRole("main")).toContainText(
  //     "Product Created Successfully"
  //   );

  //   // assert navigation
  //   await expect(page).toHaveURL(/\/dashboard\/admin\/products/);
  // });

  // test("should show error toast if API fails", async ({ page }) => {
  //   // mock POST route to fail
  //   await page.route("**/api/v1/product/create-product", async (route) => {
  //     await route.fulfill({
  //       status: INTERNAL_SERVER_ERROR_STATUS,
  //       contentType: "application/json",
  //       body: JSON.stringify({ success: false, message: "Server Error" }),
  //     });
  //   });

  //   // fill in only required fields
  //   const selectCategory = page.locator(".ant-select-dropdown");
  //   await page.click(".ant-select");
  //   await selectCategory.getByText(SAMPLE_CATEOGRIES[0].name).click();
  //   await page.click(".ant-select");
  //   await page.getByRole("textbox", { name: "Write a name" }).click();
  //   await page
  //     .getByRole("textbox", { name: "Write a name" })
  //     .fill("Broken Product");
  //   await page.getByRole("textbox", { name: "Write a description" }).click();
  //   await page
  //     .getByRole("textbox", { name: "Write a description" })
  //     .fill("This will fail");
  //   await page.getByPlaceholder("Write a Price").click();
  //   await page.getByPlaceholder("Write a Price").fill("1");
  //   await page.getByPlaceholder("Write a quantity").click();
  //   await page.getByPlaceholder("Write a quantity").fill("1");

  //   // submit
  //   await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

  //   // assert error toast
  //   await expect(page.getByRole("main")).toContainText("Something went wrong");
  // });

  // test("missing required fields should return an error", async ({ page }) => {
  //   // mock POST route to fail
  //   await page.route("**/api/v1/product/create-product", async (route) => {
  //     await route.fulfill({
  //       status: INTERNAL_SERVER_ERROR_STATUS,
  //       contentType: "application/json",
  //       body: JSON.stringify({ success: false, message: "Server Error" }),
  //     });
  //   });

  //   // partially fill out form (no price & quantity)
  //   const selectCategory = page.locator(".ant-select-dropdown");
  //   await page.click(".ant-select");
  //   await selectCategory.getByText(SAMPLE_CATEOGRIES[0].name).click();
  //   await page.click(".ant-select");
  //   await page.getByRole("textbox", { name: "Write a name" }).click();
  //   await page
  //     .getByRole("textbox", { name: "Write a name" })
  //     .fill("Half filled form's product");
  //   await page.getByRole("textbox", { name: "Write a description" }).click();
  //   await page
  //     .getByRole("textbox", { name: "Write a description" })
  //     .fill("Half filled form's description");

  //   // submit
  //   await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

  //   // assert error toast
  //   await expect(page.getByRole("main")).toContainText("Something went wrong");
  // });
});
