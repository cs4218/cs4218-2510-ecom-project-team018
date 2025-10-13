import { test, expect } from "@playwright/test";
// import type { Page } from "@playwright/test";

const SAMPLE_CATEOGRIES = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Books" },
];

test.describe("Create Category Page", () => {
  test.beforeEach(async ({ page }) => {
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

    // wait for redirect to admin page
    await page.waitForURL("/dashboard/admin/create-category");

    // mock get-category API
    await page.route("**/api/v1/category/get-category", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, category: SAMPLE_CATEOGRIES }),
      });
    });
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

    // ✅ Row 1: Electronics
    const firstRow = rows.nth(0);
    await expect(firstRow).toContainText("Electronics");
    await expect(firstRow.getByRole("button", { name: /edit/i })).toBeVisible();
    await expect(
      firstRow.getByRole("button", { name: /delete/i })
    ).toBeVisible();

    // ✅ Row 2: Books
    const secondRow = rows.nth(1);
    await expect(secondRow).toContainText("Books");
    await expect(
      secondRow.getByRole("button", { name: /edit/i })
    ).toBeVisible();
    await expect(
      secondRow.getByRole("button", { name: /delete/i })
    ).toBeVisible();
  });
});
