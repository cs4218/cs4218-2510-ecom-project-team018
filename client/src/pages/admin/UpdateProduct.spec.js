import { test, expect } from "../../../../tests/playwrightTest.js";
import fs from "fs";
import path from "path";
import userModel from "../../../../models/userModel.js";
import categoryModel from "../../../../models/categoryModel.js";
import productModel from "../../../../models/productModel.js";
import { hashPassword } from "../../../../helpers/authHelper.js";
import slugify from "slugify";

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

// sample data
const SAMPLE_CATEGORIES = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Books" },
];

const SAMPLE_PRODUCT = {
  category: SAMPLE_CATEGORIES[0].name,
  name: "Test Product",
  description: "A sample description",
  price: 50,
  quantity: 5,
  shipping: false,
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

const seedProduct = async () => {
  const category = await categoryModel.findOne({
    name: SAMPLE_CATEGORIES[0].name,
  });

  const slug = slugify("Test Product", { lower: true });
  const imagePath = path.join(
    process.cwd(),
    "client",
    "public",
    "images",
    "placeholder.png"
  );
  const imageData = fs.readFileSync(imagePath);

  const productDoc = await productModel.create({
    name: SAMPLE_PRODUCT.name,
    description: SAMPLE_PRODUCT.description,
    price: SAMPLE_PRODUCT.price,
    quantity: SAMPLE_PRODUCT.quantity,
    shipping: SAMPLE_PRODUCT.shipping,
    category: category._id,
    slug,
    photo: {
      data: imageData,
      contentType: "image/png",
    },
  });

  return productDoc;
};

// logs into the app via the login page and waits for categories to load
const loginAsAdmin = async (page) => {
  // navigate to the target page; app should redirect to /login
  await page.goto("/dashboard/admin/product/test-product");

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

  // wait for redirect to update product page
  await page.waitForURL("/dashboard/admin/product/test-product");

  // ensure category list request completes before assertions
  await page.waitForResponse((response) => {
    return (
      response.url().includes("/api/v1/category/get-category") && response.ok()
    );
  });
};

test.describe("Update Product page", () => {
  let product;

  test.beforeEach(async ({ page }) => {
    await userModel.deleteMany({});
    await categoryModel.deleteMany({});
    await productModel.deleteMany({});

    await seedAdminUser();
    await seedCategories();
    product = await seedProduct();

    // log in and land on the page with data loaded
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await userModel.deleteMany({});
    await categoryModel.deleteMany({});
    await productModel.deleteMany({});
  });

  // test("should load product and categories correctly", async ({ page }) => {
  //   // heading
  //   await expect(page.locator("h1")).toContainText("Update Product");

  //   // fields
  //   await expect(page.locator(".ant-select").first()).toHaveText(
  //     SAMPLE_PRODUCT.category
  //   );
  //   await expect(page.getByPlaceholder("write a name")).toHaveValue(
  //     SAMPLE_PRODUCT.name
  //   );
  //   await expect(page.getByPlaceholder("write a description")).toHaveValue(
  //     SAMPLE_PRODUCT.description
  //   );
  //   await expect(page.getByPlaceholder("write a Price")).toHaveValue(
  //     SAMPLE_PRODUCT.price.toString()
  //   );
  //   await expect(page.getByPlaceholder("write a quantity")).toHaveValue(
  //     SAMPLE_PRODUCT.quantity.toString()
  //   );
  //   await expect(page.locator(".ant-select").nth(1)).toHaveText(
  //     SAMPLE_PRODUCT.shipping ? "Yes" : "No"
  //   );

  //   // upload photo button
  //   await expect(page.getByText("Upload Photo")).toBeVisible();
  //   // photo preview
  //   const previewImg = page.locator("img[alt='product_photo']");
  //   await expect(previewImg).toBeVisible();

  //   // buttons
  //   await expect(
  //     page.getByRole("button", { name: "UPDATE PRODUCT" })
  //   ).toBeVisible();
  //   await expect(
  //     page.getByRole("button", { name: "DELETE PRODUCT" })
  //   ).toBeVisible();
  // });

  test("successfully updates a product and navigates to products page", async ({
    page,
  }) => {
    /*** update all fields ***/
    // change category
    await page.locator(".ant-select").first().click();
    await page
      .locator(".ant-select-dropdown")
      .getByText(SAMPLE_CATEGORIES[1].name)
      .click();
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

  // test("error when updating a product because of missing field(s)", async ({
  //   page,
  // }) => {
  //   // mock update-product API to return error
  //   await page.route("**/api/v1/product/update-product/**", (route) =>
  //     route.fulfill({
  //       status: BAD_REQUEST_STATUS,
  //       contentType: "application/json",
  //       body: JSON.stringify({
  //         success: false,
  //         message: "Name is required",
  //       }),
  //     })
  //   );

  //   // clear the product name
  //   const nameField = page.getByPlaceholder("write a name");
  //   await nameField.fill("");

  //   // submit
  //   await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

  //   // assert error toast
  //   await expect(page.getByText("Name is required")).toBeVisible();
  // });

  // test("shows error toast when API fails", async ({ page }) => {
  //   // mock the update-product API to return an internal server error (500)
  //   await page.route("**/api/v1/product/update-product/**", (route) =>
  //     route.fulfill({
  //       status: INTERNAL_SERVER_ERROR,
  //       contentType: "application/json",
  //       body: JSON.stringify({
  //         success: false,
  //         message: "Something went wrong",
  //       }),
  //     })
  //   );

  //   // submit
  //   await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

  //   // assert error toast
  //   await expect(page.getByText("Something went wrong")).toBeVisible();
  // });

  // test("successfully delete a product", async ({ page }) => {
  //   // mock the delete-product API to succeed
  //   await page.route("**/api/v1/product/delete-product/**", (route) =>
  //     route.fulfill({
  //       status: SUCCESS_STATUS,
  //       contentType: "application/json",
  //       body: JSON.stringify({
  //         success: true,
  //         message: "Product deleted successfully",
  //       }),
  //     })
  //   );

  //   // mock window.prompt to return "yes"
  //   page.on("dialog", async (dialog) => {
  //     expect(dialog.type()).toBe("prompt");
  //     await dialog.accept("yes");
  //   });

  //   // click 'delete' button
  //   await page.getByRole("button", { name: "DELETE PRODUCT" }).click();

  //   // assert success toast
  //   await expect(page.getByText("Product deleted successfully")).toBeVisible();

  //   // assert navigation to products page
  //   await expect(page).toHaveURL("/dashboard/admin/products");
  // });
});
