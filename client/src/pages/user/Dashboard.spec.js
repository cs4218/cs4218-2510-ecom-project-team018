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
});
