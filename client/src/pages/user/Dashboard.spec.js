/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from "../../../../tests/playwrightTest.js";
import userModel from "../../../../models/userModel.js";
import { hashPassword } from "../../../../helpers/authHelper.js";

const DASHBOARD_URL = "/dashboard/user";

const TEST_USER = {
  name: "Test User",
  email: `testuser${Date.now()}@example.com`,
  password: "testpassword123",
  phone: "1234567890",
  address: "123 Test Street",
  DOB: "1990-01-01",
  answer: "Football",
};

// Helper function to login a user
const loginUser = async (page, email, password) => {
  await page.goto("/login");
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

  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login$/);
  });

  test("maintains authentication state across page refreshes", async ({
    page,
  }) => {
    // Login first
    await loginUser(page, TEST_USER.email, TEST_USER.password);

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
});
