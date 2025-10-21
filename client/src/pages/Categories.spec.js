import { test, expect } from "../../../tests/playwrightTest.js";
import categoryModel from "../../../models/categoryModel.js";
import slugify from "slugify";

const SAMPLE_CATEGORIES = [
  { name: "Electronics", slug: "electronics" },
  { name: "Books", slug: "books" },
];

async function seedCategories(docs = SAMPLE_CATEGORIES) {
  const toInsert = docs.map((c) => ({
    name: c.name,
    slug: c.slug ?? slugify(c.name, { lower: true }),
  }));
  await categoryModel.insertMany(toInsert);
};

async function clearCategories() {
  await categoryModel.deleteMany({});
};

test.describe("Categories page", () => {
  test.beforeEach(async () => {
    await clearCategories();
  });

  test.afterEach(async () => {
    await clearCategories();
  });

  test("renders page title and all category buttons", async ({ page }) => {
    await seedCategories();

    await page.goto("/categories");

    await expect(page).toHaveTitle("All Categories");

    for (const cat of SAMPLE_CATEGORIES) {
      const btn = page.getByRole("link", { name: cat.name });
      await expect(btn).toBeVisible();
      await expect(btn).toHaveAttribute("href", `/category/${cat.slug}`);
    }
  });

  test("clicking a category navigates to its slug route", async ({ page }) => {
    await seedCategories();

    await page.goto("/categories");

    // Click the first category
    await page.getByRole("link", { name: SAMPLE_CATEGORIES[0].name }).click();

    await page.waitForURL(`/category/${SAMPLE_CATEGORIES[0].slug}`);
    await expect(page).toHaveURL(`/category/${SAMPLE_CATEGORIES[0].slug}`);
  });

  test("handles empty category list", async ({ page }) => {
    await page.goto("/categories");

    await expect(page).toHaveTitle("All Categories");

    // No category links rendered
    for (const cat of SAMPLE_CATEGORIES) {
      await expect(page.getByRole("link", { name: cat.name })).toHaveCount(0);
    }
  });
});
