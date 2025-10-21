import { test, expect } from "@playwright/test";

const SAMPLE_CATEGORIES = [
  { _id: "1", name: "Electronics", slug: "electronics" },
  { _id: "2", name: "Books", slug: "books" },
];

// Intercepts the Categories API and returns a fake response
async function mockGetCategories(page, { categories = SAMPLE_CATEGORIES, success = true } = {}) {
  await page.route("**/api/v1/category/get-category", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success,
        category: categories,
      }),
    });
  });
}

test.describe("Categories page", () => {
  test("renders page title and all category buttons", async ({ page }) => {
    await mockGetCategories(page);

    await page.goto("/categories");

    await expect(page).toHaveTitle("All Categories");

    for (const cat of SAMPLE_CATEGORIES) {
      const btn = page.getByRole("link", { name: cat.name });
      await expect(btn).toBeVisible();
      await expect(btn).toHaveAttribute("href", `/category/${cat.slug}`);
    }
  });

  test("clicking a category navigates to its slug route", async ({ page }) => {
    await mockGetCategories(page);

    await page.goto("/categories");

    // Click the first category
    await page.getByRole("link", { name: SAMPLE_CATEGORIES[0].name }).click();

    await page.waitForURL(`/category/${SAMPLE_CATEGORIES[0].slug}`);
    await expect(page).toHaveURL(`/category/${SAMPLE_CATEGORIES[0].slug}`);
  });

  test("handles empty category list", async ({ page }) => {
    await mockGetCategories(page, { categories: [] });

    await page.goto("/categories");

    await expect(page).toHaveTitle("All Categories");

    // No category links rendered
    for (const cat of SAMPLE_CATEGORIES) {
      await expect(page.getByRole("link", { name: cat.name })).toHaveCount(0);
    }
  });
});
