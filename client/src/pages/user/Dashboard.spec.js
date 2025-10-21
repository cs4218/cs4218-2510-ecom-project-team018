/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from "../../../../tests/playwrightTest.js";
import userModel from "../../../../models/userModel.js";
import { hashPassword } from "../../../../helpers/authHelper.js";

const DASHBOARD_URL = "/dashboard/user";
const LOGIN_URL = "/login";
const HOME_URL = "/";

const TEST_USER = {
  name: "Test User",
  email: `testuser@example.com`,
  password: "testpassword123",
  phone: "1234567890",
  address: "123 Test Street",
  DOB: "1990-01-01",
  answer: "Football",
};

// Helper function to login a user
const loginUser = async (page, email, password) => {
  await page.goto(LOGIN_URL);
  await page.getByRole("textbox", { name: /enter your email/i }).fill(email);
  await page
    .getByRole("textbox", { name: /enter your password/i })
    .fill(password);
  await page.getByRole("button", { name: /login/i }).click();
};

test.describe("Dashboard Page", () => {
  test.beforeEach(async () => {
    await userModel.deleteMany({
      email: TEST_USER.email,
    });

    // Create test user in database
    const hashedPassword = await hashPassword(TEST_USER.password);
    await userModel.create({
      ...TEST_USER,
      password: hashedPassword,
    });
  });

  test.afterEach(async () => {
    // Clean up test users after each test
    await userModel.deleteMany({
      email: TEST_USER.email,
    });
  });

  test("redirects to home page when not authenticated", async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    await expect(page).toHaveURL(HOME_URL);
  });

  test("maintains authentication state across page refreshes", async ({
    page,
  }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(HOME_URL);

    // Navigate to dashboard
    await page.goto(DASHBOARD_URL);

    // Verify user is logged in
    await expect(page.getByText(`user: ${TEST_USER.name}`)).toBeVisible();

    // Refresh the page
    await page.reload();

    // Should still be logged in and show user data
    await expect(page.getByText(`user: ${TEST_USER.name}`)).toBeVisible();
    await expect(page.getByText(`email: ${TEST_USER.email}`)).toBeVisible();
  });

  test("displays user information when authenticated", async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(HOME_URL);

    // Navigate to dashboard
    await page.goto(DASHBOARD_URL);

    // Check page title
    await expect(page).toHaveTitle(/dashboard/i);

    // Check that user information is displayed
    await expect(page.getByText(`user: ${TEST_USER.name}`)).toBeVisible();
    await expect(page.getByText(`email: ${TEST_USER.email}`)).toBeVisible();
    await expect(page.getByText(`address: ${TEST_USER.address}`)).toBeVisible();
  });

  test("handles missing user data gracefully", async ({ page }) => {
    // Create a user with minimal data
    const minimalUser = {
      name: "Minimal User",
      email: `minimal${Date.now()}@example.com`,
      password: "testpassword123",
      phone: "phone",
      address: "123",
      DOB: "",
      answer: "Test",
    };

    const hashedPassword = await hashPassword(minimalUser.password);
    await userModel.create({
      ...minimalUser,
      password: hashedPassword,
    });
    await userModel.updateOne(
      { email: minimalUser.email },
      { $unset: { phone: "", address: "" } }
    );

    // Login with minimal user
    await loginUser(page, minimalUser.email, minimalUser.password);
    await expect(page).toHaveURL(HOME_URL);
    // Navigate to dashboard
    await page.goto(DASHBOARD_URL);

    // Should show user name but fallback for missing data
    await expect(page.getByText(`user: ${minimalUser.name}`)).toBeVisible();
    await expect(page.getByText(`email: ${minimalUser.email}`)).toBeVisible();
    await expect(page.getByText(/address: address not found/i)).toBeVisible();

    // Clean up
    await userModel.deleteMany({ email: minimalUser.email });
  });

  test("shows user menu on dashboard", async ({ page }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page).toHaveURL(HOME_URL);

    // Navigate to dashboard
    await page.goto(DASHBOARD_URL);

    // Check that user menu is present
    const userMenu = page
      .locator('[data-testid="user-menu"]')
      .or(
        page
          .getByRole("navigation")
          .or(page.locator(".user-menu").or(page.locator("nav")))
      );

    await expect(userMenu).toBeVisible();
  });
});
