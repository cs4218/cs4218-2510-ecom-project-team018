import { test, expect } from "@playwright/test";

const SAMPLE_PRODUCTS = [
  { _id: "p1", name: "Smartphone", slug: "smartphone", description: "A smartphone." },
  { _id: "p2", name: "Laptop", slug: "laptop", description: "A laptop." },
];

async function seedAdminAuth(page) {
  await page.addInitScript(() => {
    const adminAuth = {
      token: "test-token",
      user: { name: "Admin", role: 1, address: "123 Road" },
    };
    localStorage.setItem("auth", JSON.stringify(adminAuth));
  });
}


// Mock products API
async function mockGetProducts(page, { products = SAMPLE_PRODUCTS, status = 200, success = true } = {}) {
  await page.route("**/api/v1/product/get-product", async (route) => {
    if (status >= 400) {
      return route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Server error" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success, products }),
    });
  });
}

test.describe("Admin Products UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/auth/user-auth", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, success: true }) })
    );
    await page.route("**/api/v1/auth/admin-auth", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, success: true }) })
    );
  });

  test("renders heading and product cards", async ({ page }) => {
    await seedAdminAuth(page);
    await mockGetProducts(page);

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
    await expect(cards).toHaveCount(SAMPLE_PRODUCTS.length);

    for (const p of SAMPLE_PRODUCTS) {
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
    await mockGetProducts(page);

    await page.goto("/dashboard/admin/products");

    await page.getByRole("link", { name: SAMPLE_PRODUCTS[0].name }).click();
    await page.waitForURL(`/dashboard/admin/product/${SAMPLE_PRODUCTS[0].slug}`);
    await expect(page).toHaveURL(`/dashboard/admin/product/${SAMPLE_PRODUCTS[0].slug}`);
  });

  test("renders empty state (no product cards) when API returns empty list", async ({ page }) => {
    await seedAdminAuth(page);
    await mockGetProducts(page, { products: [] });

    await page.goto("/dashboard/admin/products");

    await expect(page.getByRole("heading", { name: /All Products/i })).toBeVisible();
    await expect(page.locator(".product-link")).toHaveCount(0);
  });

  test("handles server failure", async ({ page }) => {
    await seedAdminAuth(page);
    await mockGetProducts(page, { status: 500 });

    await page.goto("/dashboard/admin/products");

    await expect(page.getByRole("heading", { name: /All Products/i })).toBeVisible();
    await expect(page.locator(".product-link")).toHaveCount(0);
  });
});
