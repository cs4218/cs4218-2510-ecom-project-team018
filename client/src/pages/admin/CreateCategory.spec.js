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
});
