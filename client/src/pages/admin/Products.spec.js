import { test, expect } from "../../../../tests/playwrightTest.js";
import productModel from "../../../../models/productModel.js";
import categoryModel from "../../../../models/categoryModel.js";
import slugify from "slugify";

async function ensureTestCategory() {
  let cat = await categoryModel.findOne({ slug: "test-cat" });
  if (!cat) {
    cat = await categoryModel.create({ name: "Test Cat", slug: "test-cat" });
  }
  return cat;
}

async function clearProductsAndCategories() {
  await productModel.deleteMany({});
  await categoryModel.deleteMany({});
}

async function seedProducts(items) {
  const cat = await ensureTestCategory();

  const docs = await productModel.insertMany(
    items.map(({ name, description }) => ({
      name,
      slug: slugify(name, { lower: true }),
      description,
      price: 1,
      quantity: 10,
      category: cat._id,
    }))
  );
  return docs.map((d) => d.toObject());
}

async function seedAdminAuth(page) {
  await page.addInitScript(() => {
    const adminAuth = {
      token: "test-token",
      user: { name: "Admin", role: 1, address: "123 Road" },
    };
    localStorage.setItem("auth", JSON.stringify(adminAuth));
  });
}

test.describe("Admin Products UI", () => {
  test.beforeEach(async ({ page }) => {
    await clearProductsAndCategories();

    await page.route("**/api/v1/auth/user-auth", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, success: true }) })
    );
    await page.route("**/api/v1/auth/admin-auth", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, success: true }) })
    );
    // Silence product-photo fetches so tests don’t fail if no image/binary is stored
    await page.route("**/api/v1/product/product-photo/**", (route) =>
      route.fulfill({ status: 204 })
    );
  });

  test.afterEach(async () => {
    await clearProductsAndCategories();
  });

  test("renders heading and product cards", async ({ page }) => {
    await seedAdminAuth(page);

    const seeded = await seedProducts([
      { name: "Smartphone", description: "A smartphone." },
      { name: "Laptop", description: "A laptop." },
    ]);

    await page.goto("/dashboard/admin/products", { waitUntil: "domcontentloaded" });

    const heading = page.getByRole("heading", { name: "All Products List" });
    const firstCard = page.locator(".product-link").first();

    // Wait for either the heading OR the first card
    await expect(async () => {
      const hv = await heading.isVisible().catch(() => false);
      const cv = await firstCard.isVisible().catch(() => false);
      expect(hv || cv).toBeTruthy();
    }).toPass();


    // Validate cards when products exist
    const cards = page.locator(".product-link");
    await expect(cards).toHaveCount(seeded.length);

    for (const p of seeded) {
      const link = page.getByRole("link", { name: p.name, exact: false });
      await expect(link).toHaveAttribute("href", `/dashboard/admin/product/${p.slug}`);

      const card = page.locator(".card", { hasText: p.name });
      await expect(card.getByRole("heading", { name: p.name })).toBeVisible();
      await expect(card.getByText(p.description)).toBeVisible();

      const img = card.locator("img.card-img-top");
      await expect(img).toHaveAttribute("src", `/api/v1/product/product-photo/${p._id}`);
      await expect(img).toHaveAttribute("alt", p.name);
    }
  });

  test("navigates to product detail when a product card is clicked", async ({ page }) => {
    await seedAdminAuth(page);

    const [first] = await seedProducts([
      { name: "Tablet", description: "A tablet." },
      { name: "Headphones", description: "Audio device." },
    ]);

    await page.goto("/dashboard/admin/products");

    await page.getByRole("link", { name: first.name }).click();
    await page.waitForURL(`/dashboard/admin/product/${first.slug}`);
    await expect(page).toHaveURL(`/dashboard/admin/product/${first.slug}`);
  });

  test("renders empty state (no product cards) when API returns empty list", async ({ page }) => {
    await seedAdminAuth(page);
    await clearProductsAndCategories();

    await page.goto("/dashboard/admin/products");

    await expect(page.getByRole("heading", { name: /All Products/i })).toBeVisible();
    await expect(page.locator(".product-link")).toHaveCount(0);
  });

  test("handles server failure", async ({ page }) => {
    await seedAdminAuth(page);

    // Force it to return 500 for this test
    await page.route("**/api/v1/product/get-product", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Server error" }),
      })
    );

    await page.goto("/dashboard/admin/products");

    await expect(page.getByRole("heading", { name: /All Products/i })).toBeVisible();
    await expect(page.locator(".product-link")).toHaveCount(0);
  });
});
