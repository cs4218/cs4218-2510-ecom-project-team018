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

  test("validates password length", async ({ page }) => {
    await page.goto(REGISTER_URL);

    // Fill form with long password (73 characters)
    const longPassword = "a".repeat(73);
    const truncatedPassword = "a".repeat(72);

    await page
      .getByRole("textbox", { name: /enter your password/i })
      .fill(longPassword);

    const passwordValue = await page
      .getByRole("textbox", { name: /enter your password/i })
      .inputValue();
    expect(passwordValue).not.toBe(longPassword);
    expect(passwordValue).toBe(truncatedPassword);
  });

  test("validates email format", async ({ page }) => {
    await page.goto(REGISTER_URL);

    // Fill form with invalid email
    await page
      .getByRole("textbox", { name: /enter your name/i })
      .fill(TEST_USER.name);
    await page
      .getByRole("textbox", { name: /enter your email/i })
      .fill("invalid-email"); // invalid email format
    await page
      .getByRole("textbox", { name: /enter your password/i })
      .fill(TEST_USER.password);
    await page
      .getByRole("textbox", { name: /enter your phone/i })
      .fill(TEST_USER.phone);
    await page
      .getByRole("textbox", { name: /enter your address/i })
      .fill(TEST_USER.address);
    await page.locator('input[type="date"]').fill(TEST_USER.DOB);
    await page
      .getByRole("textbox", { name: /what is your favorite sports/i })
      .fill(TEST_USER.answer);

    await page.getByRole("button", { name: /register/i }).click();

    await expect(page).toHaveURL(REGISTER_URL);
  });

  test("validates required security answer", async ({ page }) => {
    await page.goto(REGISTER_URL);

    // Fill form without security answer
    await page
      .getByRole("textbox", { name: /enter your name/i })
      .fill(TEST_USER.name);
    await page
      .getByRole("textbox", { name: /enter your email/i })
      .fill(TEST_USER.email);
    await page
      .getByRole("textbox", { name: /enter your password/i })
      .fill(TEST_USER.password);
    await page
      .getByRole("textbox", { name: /enter your phone/i })
      .fill(TEST_USER.phone);
    await page
      .getByRole("textbox", { name: /enter your address/i })
      .fill(TEST_USER.address);
    await page.locator('input[type="date"]').fill(TEST_USER.DOB);
    // empty security answer

    await page.getByRole("button", { name: /register/i }).click();

    await expect(page).toHaveURL(REGISTER_URL);
  });

  test("successfully registers a new user", async ({ page }) => {
    await registerUser(page, TEST_USER);

    // Should show success message and redirect to login
    await expect(page).toHaveURL(/\/login$/);

    // Check for success toast message
    await expect(page.getByText(/register successfully/i)).toBeVisible();
  });

  test("prevents duplicate email registration", async ({ page }) => {
    // First, register a user
    await registerUser(page, EXISTING_USER);

    // Try to register with the same email
    await page.goto(REGISTER_URL);
    await page
      .getByRole("textbox", { name: /enter your name/i })
      .fill("Different Name");
    await page
      .getByRole("textbox", { name: /enter your email/i })
      .fill(EXISTING_USER.email);
    await page
      .getByRole("textbox", { name: /enter your password/i })
      .fill("differentpassword");
    await page
      .getByRole("textbox", { name: /enter your phone/i })
      .fill("1111111111");
    await page
      .getByRole("textbox", { name: /enter your address/i })
      .fill("Different Address");
    await page.locator('input[type="date"]').fill("1995-01-01");
    await page
      .getByRole("textbox", { name: /what is your favorite sports/i })
      .fill("Tennis");

    await page.getByRole("button", { name: /register/i }).click();

    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });

  test("handles network errors gracefully", async ({ page }) => {
    // Mock network failure
    await page.route("**/api/v1/auth/register", (route) => {
      route.abort("failed");
    });

    await registerUser(page, TEST_USER);

    // Should show error message
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });

  test("redirects to login after successful registration", async ({ page }) => {
    await registerUser(page, TEST_USER);

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login$/);

    // Should show success message
    await expect(page.getByText(/register successfully/i)).toBeVisible();
  });
});
