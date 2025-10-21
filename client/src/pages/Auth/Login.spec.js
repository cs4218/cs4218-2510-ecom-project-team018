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
});
