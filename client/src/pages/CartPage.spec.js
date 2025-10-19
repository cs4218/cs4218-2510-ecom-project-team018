import { test, expect } from "@playwright/test";

async function seedLocalStorage(page, { auth = null, cart = [] } = {}) {
  await page.addInitScript((payload) => {
    const { auth, cart } = payload;
    if (auth) {
      localStorage.setItem("auth", JSON.stringify(auth));
    } else {
      localStorage.removeItem("auth");
    }
    localStorage.setItem("cart", JSON.stringify(cart));
  }, { auth, cart });
}

test.describe("CartPage UI", () => {
  test("renders guest view with empty cart", async ({ page }) => {
    await seedLocalStorage(page, { auth: null, cart: [] });

    await page.route("**/api/v1/product/braintree/token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "no token" }),
      })
    );

    await page.goto("/cart");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello Guest");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your Cart Is Empty");

    const loginBtn = page.getByRole("button", { name: /Please Login to checkout/i });
    await expect(loginBtn).toBeVisible();

    await loginBtn.click();
    await page.waitForURL("/login");
  });

  test("renders guest view with cart items", async ({ page }) => {
    const prod1 = { _id: "p1", name: "Smartphone", description: "desc1", price: 1000 };
    const prod2 = { _id: "p2", name: "Laptop", description: "desc2", price: 1500 };

    await seedLocalStorage(page, { auth: null, cart: [prod1, prod2] });

    await page.route("**/api/v1/product/braintree/token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "no token" }),
      })
    );

    await page.goto("/cart");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello Guest");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("You Have 2 items in your cart");

    await expect(page.getByText("Smartphone")).toBeVisible();
    await expect(page.getByText("Laptop")).toBeVisible();

    // Remove first item
    const phoneCard = page.locator(".card", { hasText: "Smartphone" });
    await phoneCard.getByRole("button", { name: /Remove/i }).click();

    await expect(page.getByText("Smartphone")).toHaveCount(0);
    await expect(page.getByText("Laptop")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("You Have 1 items in your cart");

    await expect(page.getByText(/Total :/)).toContainText("$1,500.00");
  });

  test("renders user logged in but no address", async ({ page }) => {
    const auth = { token: "t", user: { name: "Alice", address: "" } };
    const prod = { _id: "p1", name: "Smartphone", description: "d", price: 1000 };

    await seedLocalStorage(page, { auth, cart: [prod] });

    await page.route("**/api/v1/product/braintree/token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "no token" }),
      })
    );

    await page.goto("/cart");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello Alice");
    await expect(page.getByRole("button", { name: /Update Address/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("You Have 1 items in your cart");

    // No Make Payment button because no token
    await expect(page.getByRole("button", { name: /Make Payment/i })).toHaveCount(0);
  });

  test("Update Address navigates to profile", async ({ page }) => {
    const auth = { token: "t", user: { name: "Bob", address: "123 Road" } };
    const prod = { _id: "p1", name: "Book", description: "d", price: 25 };

    await seedLocalStorage(page, { auth, cart: [prod] });

    await page.route("**/api/v1/product/braintree/token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "no token" }),
      })
    );

    await page.goto("/cart");

    const updateBtn = page.getByRole("button", { name: /Update Address/i });
    await expect(updateBtn).toBeVisible();
    await updateBtn.click();

    await page.waitForURL("/dashboard/user/profile");
  });

  test("disables Make Payment button when user lacks address", async ({ page }) => {
    const auth = { token: "t", user: { name: "Alice", address: "" } };
    const prod = { _id: "p1", name: "Book", description: "d", price: 10 };

    await seedLocalStorage(page, { auth, cart: [prod] });

    await page.route("**/api/v1/product/braintree/token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, clientToken: "test-client-token" }),
      })
    );

    await page.goto("/cart");

    const makePayment = page.getByRole("button", { name: /Make Payment/i });
    await expect(makePayment).toBeVisible();
    await expect(makePayment).toBeDisabled();
  });
});
