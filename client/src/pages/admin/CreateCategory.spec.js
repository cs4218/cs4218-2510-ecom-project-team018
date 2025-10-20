import { test, expect } from "../../../../tests/playwrightTest.js";
import userModel from "../../../../models/userModel.js";
import categoryModel from "../../../../models/categoryModel.js";
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

// initial categories that should appear in the table
const INITIAL_CATEGORY_NAMES = ["Electronics", "Books"];

// names used across create/update flows
const CREATED_CATEGORY_NAME = "Clothing";
const UPDATED_CATEGORY_NAME = "Gadgets";

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
  const docs = INITIAL_CATEGORY_NAMES.map((name) => ({
    name,
    slug: slugify(name, { lower: true }),
  }));
  await categoryModel.insertMany(docs);
};

// logs into the app via the login page and waits for categories to load
const loginAsAdmin = async (page) => {
  // navigate to the target page; app should redirect to /login
  await page.goto("/dashboard/admin/create-category");

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
  await page.waitForURL("/dashboard/admin/create-category");

  // ensure category list request completes before assertions
  await page.waitForResponse((response) => {
    return (
      response.url().includes("/api/v1/category/get-category") && response.ok()
    );
  });
};

// convenience accessor for table rows
const getTableRows = (page) => page.locator("table tbody tr");

test.describe("Create Category Page", () => {
  test.beforeEach(async ({ page }) => {
    await userModel.deleteMany({});
    await categoryModel.deleteMany({});

    // seed an admin user and initial categories
    await seedAdminUser();
    await seedCategories();

    // log in and land on the page with data loaded
    await loginAsAdmin(page);

    // sanity check: table shows the seeded categories
    await expect(getTableRows(page)).toHaveCount(INITIAL_CATEGORY_NAMES.length);
  });

  test.afterAll(async () => {
    await userModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  test("renders all components", async ({ page }) => {
    // heading
    await expect(page.locator("h1")).toHaveText("Manage Category");

    // new category inputs
    await expect(page.getByPlaceholder("Enter new category")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();

    // table headers
    await expect(
      page.getByRole("columnheader", { name: "Name" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Actions" })
    ).toBeVisible();

    // rows
    const rows = getTableRows(page);
    await expect(rows).toHaveCount(INITIAL_CATEGORY_NAMES.length);

    for (let i = 0; i < INITIAL_CATEGORY_NAMES.length; i++) {
      const currRow = rows.nth(i);
      await expect(currRow).toContainText(INITIAL_CATEGORY_NAMES[i]);
      await expect(
        currRow.getByRole("button", { name: /edit/i })
      ).toBeVisible();
      await expect(
        currRow.getByRole("button", { name: /delete/i })
      ).toBeVisible();
    }
  });

  test("successfully create a new category", async ({ page }) => {
    // fill in new category
    await page.getByRole("textbox", { name: "Enter new category" }).click();
    await page
      .getByRole("textbox", { name: "Enter new category" })
      .fill(CREATED_CATEGORY_NAME);
    // submit
    await page.getByRole("button", { name: "Submit" }).click();

    // assert toast appears
    await expect(
      page.getByText(`${CREATED_CATEGORY_NAME} is created`)
    ).toBeVisible();

    // new category shows in table - row 3: Clothing
    await expect(getTableRows(page)).toHaveCount(
      INITIAL_CATEGORY_NAMES.length + 1
    );
    const thirdRow = page.locator("table tbody tr").nth(2);
    await expect(thirdRow).toContainText(CREATED_CATEGORY_NAME);
    await expect(thirdRow.getByRole("button", { name: /edit/i })).toBeVisible();
    await expect(
      thirdRow.getByRole("button", { name: /delete/i })
    ).toBeVisible();
  });

  test("unable to create a new category when form is empty", async ({
    page,
  }) => {
    // submit empty form
    await page.getByRole("button", { name: "Submit" }).click();
    // assert error
    await expect(page.getByRole("main")).toContainText(
      "something went wrong in input form"
    );

    // table remains unchanged
    await expect(getTableRows(page)).toHaveCount(INITIAL_CATEGORY_NAMES.length);
  });

  test("successfully update a category name", async ({ page }) => {
    // open edit modal for the first row
    await page.getByRole("button", { name: "Edit" }).first().click();

    // replace input value with the updated name
    const modalInput = page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Enter new category" });
    await modalInput.press("ControlOrMeta+a");
    await modalInput.fill(UPDATED_CATEGORY_NAME);

    // submit
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Submit" })
      .click();

    // assert success toast
    await expect(page.getByRole("main")).toContainText(
      UPDATED_CATEGORY_NAME + " is updated"
    );

    // table shows updated name
    await expect(
      page.getByRole("row", { name: new RegExp(UPDATED_CATEGORY_NAME, "i") })
    ).toBeVisible();
  });

  test("successfully delete a category", async ({ page }) => {
    // capture initial row count
    const initialRowCount = await getTableRows(page).count();

    // delete first row cat
    await page.getByRole("button", { name: "Delete" }).first().click();

    // assert success toast
    await expect(page.getByRole("main")).toContainText("category is deleted");

    // table has 1 less row
    await expect(getTableRows(page)).toHaveCount(initialRowCount - 1);

    // assert deleted category doesnt exist
    await expect(page.getByRole("main")).not.toContainText(
      INITIAL_CATEGORY_NAMES[0]
    );
  });
});
