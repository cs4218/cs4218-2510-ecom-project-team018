/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from "../../../../tests/playwrightTest.js";
import userModel from "../../../../models/userModel.js";

const REGISTER_URL = "/register";

const TEST_USER = {
  name: "Test User",
  email: `testuser${Date.now()}@example.com`,
  password: "testpassword123",
  phone: "1234567890",
  address: "123 Test Street",
  DOB: "1990-01-01",
  answer: "Football",
};

const EXISTING_USER = {
  name: "Existing User",
  email: `existinguser${Date.now()}@example.com`,
  password: "existingpassword123",
  phone: "9876543210",
  address: "456 Existing Street",
  DOB: "1985-05-15",
  answer: "Basketball",
};

// Helper function to register a user
const registerUser = async (page, userData) => {
  await page.goto(REGISTER_URL);
  await page
    .getByRole("textbox", { name: /enter your name/i })
    .fill(userData.name);
  await page
    .getByRole("textbox", { name: /enter your email/i })
    .fill(userData.email);
  await page
    .getByRole("textbox", { name: /enter your password/i })
    .fill(userData.password);
  await page
    .getByRole("textbox", { name: /enter your phone/i })
    .fill(userData.phone);
  await page
    .getByRole("textbox", { name: /enter your address/i })
    .fill(userData.address);
  await page.locator('input[type="date"]').fill(userData.DOB);
  await page
    .getByRole("textbox", { name: /what is your favorite sports/i })
    .fill(userData.answer);
  await page.getByRole("button", { name: /register/i }).click();
};

test.describe("Register Page", () => {
  test.beforeEach(async ({ page }) => {
    // Clean up any existing test users
    await userModel.deleteMany({
      email: { $in: [TEST_USER.email, EXISTING_USER.email] },
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up test users after each test
    await userModel.deleteMany({
      email: { $in: [TEST_USER.email, EXISTING_USER.email] },
    });
  });

  test("displays register form with all required fields", async ({ page }) => {
    await page.goto(REGISTER_URL);

    // Check page title
    await expect(page).toHaveTitle(/register/i);

    // Check form heading
    await expect(
      page.getByRole("heading", { name: /register form/i })
    ).toBeVisible();

    // Check all form fields are present
    await expect(
      page.getByRole("textbox", { name: /enter your name/i })
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /enter your email/i })
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /enter your password/i })
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /enter your phone/i })
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /enter your address/i })
    ).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /what is your favorite sports/i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /register/i })).toBeVisible();
  });

  test("validates required fields", async ({ page }) => {
    await page.goto(REGISTER_URL);

    // Try to submit empty form
    await page.getByRole("button", { name: /register/i }).click();

    // Check that required field validation is triggered
    const nameInput = page.getByRole("textbox", { name: /enter your name/i });
    const emailInput = page.getByRole("textbox", { name: /enter your email/i });
    const passwordInput = page.getByRole("textbox", {
      name: /enter your password/i,
    });

    await expect(nameInput).toHaveAttribute("required");
    await expect(emailInput).toHaveAttribute("required");
    await expect(passwordInput).toHaveAttribute("required");
  });

  test("has proper form accessibility", async ({ page }) => {
    await page.goto(REGISTER_URL);

    // Check that inputs have proper types and labels
    const nameInput = page.getByRole("textbox", { name: /enter your name/i });
    const emailInput = page.getByRole("textbox", { name: /enter your email/i });
    const passwordInput = page.getByRole("textbox", {
      name: /enter your password/i,
    });
    const phoneInput = page.getByRole("textbox", { name: /enter your phone/i });
    const addressInput = page.getByRole("textbox", {
      name: /enter your address/i,
    });
    const dobInput = page.locator('input[type="date"]');
    const answerInput = page.getByRole("textbox", {
      name: /what is your favorite sports/i,
    });

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(phoneInput).toBeVisible();
    await expect(addressInput).toBeVisible();
    await expect(dobInput).toHaveAttribute("type", "date");
    await expect(answerInput).toBeVisible();
  });
});
