/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from "../../../../tests/playwrightTest.js";
import userModel from "../../../../models/userModel.js";
import { hashPassword } from "../../../../helpers/authHelper.js";

const LOGIN_URL = "/login";
const TEST_USER = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
  phone: "123-456-7890",
  address: "123 Test Street",
  answer: "test",
};

const seedTestUser = async () => {
  await userModel.create({
    name: TEST_USER.name,
    email: TEST_USER.email,
    password: await hashPassword(TEST_USER.password),
    phone: TEST_USER.phone,
    address: TEST_USER.address,
    answer: TEST_USER.answer,
    role: 0,
  });
};

const loginUser = async (page, email, password) => {
  await page.goto(LOGIN_URL);
  await page.getByRole("textbox", { name: /enter your email/i }).fill(email);
  await page
    .getByRole("textbox", { name: /enter your password/i })
    .fill(password);
  await page.getByRole("button", { name: /login/i }).click();
};

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await userModel.deleteMany({});
    await seedTestUser();
  });

  test.afterAll(async () => {
    await userModel.deleteMany({});
  });

  test("renders document title and main heading", async ({ page }) => {
    await page.goto(LOGIN_URL);

    await expect(page).toHaveTitle(/login/i);
    await expect(
      page.getByRole("heading", { name: /login form/i })
    ).toBeVisible();
  });

  test("displays form elements correctly", async ({ page }) => {
    await page.goto(LOGIN_URL);

    // Check form elements are present
    await expect(
      page.getByRole("textbox", { name: /enter your email/i })
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /enter your password/i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /login/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /forgot password/i })
    ).toBeVisible();
  });

  test("validates required fields", async ({ page }) => {
    await page.goto(LOGIN_URL);

    // Try to submit empty form
    await page.getByRole("button", { name: /login/i }).click();

    // Form should not submit due to HTML5 validation
    await expect(page).toHaveURL(/\/login$/);
  });

  test("form inputs are accessible", async ({ page }) => {
    await page.goto(LOGIN_URL);

    // Check that inputs have proper labels/placeholders
    const emailInput = page.getByRole("textbox", { name: /enter your email/i });
    const passwordInput = page.getByRole("textbox", {
      name: /enter your password/i,
    });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("successfully logs in with valid credentials", async ({ page }) => {
    await loginUser(page, TEST_USER.email, TEST_USER.password);

    // Should redirect to home page after successful login
    await expect(page).toHaveURL(/\/$/);

    // Check that user is logged in by looking for user-specific elements
    await expect(page.getByRole("link", { name: /login/i })).not.toBeVisible();
  });

  test("shows error for invalid email", async ({ page }) => {
    await loginUser(page, "nonexistent@example.com", TEST_USER.password);

    // Should stay on login page and show error
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });

  test("shows error for invalid password", async ({ page }) => {
    await loginUser(page, TEST_USER.email, "wrongpassword");

    // Should stay on login page and show error
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });

  test("navigates to forgot password page", async ({ page }) => {
    await page.goto(LOGIN_URL);

    await Promise.all([
      page.waitForURL("**/forgot-password"),
      page.getByRole("button", { name: /forgot password/i }).click(),
    ]);

    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  test("persists login state across page refreshes", async ({ page }) => {
    await loginUser(page, TEST_USER.email, TEST_USER.password);

    // Should be on home page
    await expect(page).toHaveURL(/\/$/);

    // Refresh the page
    await page.reload();

    // Should still be logged in
    await expect(page.getByRole("link", { name: /login/i })).not.toBeVisible();
  });

  test("handles network errors gracefully", async ({ page }) => {
    // Intercept the login request and make it fail
    await page.route("**/api/v1/auth/login", (route) => {
      route.abort("failed");
    });

    await loginUser(page, TEST_USER.email, TEST_USER.password);

    // Should show error message
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });
});
