import { test, expect } from "@playwright/test";
// import type { Page } from "@playwright/test";

// sample category data
const SAMPLE_CATEOGRIES = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Books" },
];

const SAMPLE_NEW_CATEGORY = { _id: "3", name: "Clothing" };

// status codes
const SUCCESS_STATUS = 200;
const BAD_REQUEST_STATUS = 400;

let currentCategories;

test.describe("Create Category Page", () => {
  test.beforeEach(async ({ page }) => {
    currentCategories = [...SAMPLE_CATEOGRIES];

    // mock get-category API
    await page.route("**/api/v1/category/get-category", async (route) => {
      await route.fulfill({
        status: SUCCESS_STATUS,
        contentType: "application/json",
        body: JSON.stringify({ success: true, category: currentCategories }),
      });
    });

    // go to the create-category page
    await page.goto("/dashboard/admin/create-category");

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

    // wait for redirect to create-category page
    await page.waitForURL("/dashboard/admin/create-category");
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
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(2);

    // row 1: Electronics
    const firstRow = rows.nth(0);
    await expect(firstRow).toContainText(SAMPLE_CATEOGRIES[0].name);
    await expect(firstRow.getByRole("button", { name: /edit/i })).toBeVisible();
    await expect(
      firstRow.getByRole("button", { name: /delete/i })
    ).toBeVisible();

    // row 2: Books
    const secondRow = rows.nth(1);
    await expect(secondRow).toContainText(SAMPLE_CATEOGRIES[1].name);
    await expect(
      secondRow.getByRole("button", { name: /edit/i })
    ).toBeVisible();
    await expect(
      secondRow.getByRole("button", { name: /delete/i })
    ).toBeVisible();
  });

  test("successfully create a new category", async ({ page }) => {
    // mock create-category API for success response
    await page.route("**/api/v1/category/create-category", async (route) => {
      const body = await route.request().postDataJSON();
      // push the new category into the shared array so get-category returns it next
      const newCategory = {
        _id: `${currentCategories.length + 1}`,
        name: body.name,
      };
      currentCategories.push(newCategory);
      await route.fulfill({
        status: SUCCESS_STATUS,
        contentType: "application/json",
        body: JSON.stringify({ success: true, category: newCategory }),
      });
    });

    // fill in new category
    await page.getByRole("textbox", { name: "Enter new category" }).click();
    await page
      .getByRole("textbox", { name: "Enter new category" })
      .fill(SAMPLE_NEW_CATEGORY.name);
    // submit
    await page.getByRole("button", { name: "Submit" }).click();

    // assert toast appears
    await expect(
      page.getByText(`${SAMPLE_NEW_CATEGORY.name} is created`)
    ).toBeVisible();

    // new category shows in table - row 3: Clothing
    const thirdRow = page.locator("table tbody tr").nth(2);
    await expect(thirdRow).toContainText(SAMPLE_NEW_CATEGORY.name);
    await expect(thirdRow.getByRole("button", { name: /edit/i })).toBeVisible();
    await expect(
      thirdRow.getByRole("button", { name: /delete/i })
    ).toBeVisible();
  });

  test("unable to create a new category when form is empty", async ({
    page,
  }) => {
    // mock create-category API for fail response
    await page.route("**/api/v1/category/create-category", async (route) => {
      const body = await route.request().postDataJSON();
      if (!body.name || body.name.trim() === "") {
        await route.fulfill({
          status: BAD_REQUEST_STATUS,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "something went wrong in input form",
          }),
        });
        return;
      }
    });

    // fill in nth
    await page.getByRole("textbox", { name: "Enter new category" }).click();
    await page.getByRole("textbox", { name: "Enter new category" }).fill("");
    // submit
    await page.getByRole("button", { name: "Submit" }).click();
    // assert error
    await expect(page.getByRole("main")).toContainText(
      "something went wrong in input form"
    );
  });

  test("successfully update a category name", async ({ page }) => {
    // this test updates "electronics" to "clothing"
    // mock update-category API for success response
    await page.route("**/api/v1/category/update-category/*", async (route) => {
      const body = await route.request().postDataJSON();
      expect(body.name).toBe(SAMPLE_NEW_CATEGORY.name);
      await route.fulfill({
        status: SUCCESS_STATUS,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    // click 'edit' button for first "electronics" row
    await page.getByRole("button", { name: "Edit" }).first().click();

    // key in "clothing"
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Enter new category" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Enter new category" })
      .press("ControlOrMeta+a");
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Enter new category" })
      .fill(SAMPLE_NEW_CATEGORY.name);
    // submit
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Submit" })
      .click();

    // assert success toast
    await expect(page.getByRole("main")).toContainText(
      SAMPLE_NEW_CATEGORY.name + " is updated"
    );
  });
});
