/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from "../../../../tests/playwrightTest.js";
import userModel from "../../../../models/userModel.js";
import { hashPassword } from "../../../../helpers/authHelper.js";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "password";
const ADMIN_NAME = "Playwright Admin";
const formatAsMomentLLL = (isoDate) => {
  const date = new Date(isoDate ?? new Date().toISOString());
  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.toLocaleString("en-US", { day: "numeric" });
  const year = date.getFullYear();
  const time = date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${month} ${day}, ${year} ${time}`;
};

const seedAdminUser = async () => {
  await userModel.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: await hashPassword(ADMIN_PASSWORD),
    phone: "999",
    address: "Admin HQ",
    answer: "admin",
    role: 1,
  });
};

const seedUsers = async (users = []) => {
  const hashed = await Promise.all(
    users.map(async (user) => ({
      ...user,
      password: await hashPassword(user.password ?? "userpassword"),
      answer: user.answer ?? "test",
    }))
  );
  await userModel.insertMany(hashed);
};

const loginAsAdmin = async (page) => {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: /enter your email/i })
    .fill(ADMIN_EMAIL);
  await page
    .getByRole("textbox", { name: /enter your password/i })
    .fill(ADMIN_PASSWORD);
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole("button", { name: /login/i }).click(),
  ]);
};

const navigateToUsersPage = async (page) => {
  await page.goto("/dashboard/admin/users");
};

test.describe("Admin Users page", () => {
  test.beforeEach(async ({ page }) => {
    await userModel.deleteMany({});
    await seedAdminUser();
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await userModel.deleteMany({});
  });

  test("renders table with seeded users and admin account", async ({
    page,
  }) => {
    const seededUsers = [
      {
        name: "Alice Johnson",
        email: "alice@example.com",
        phone: "123-456-7890",
        address: "123 Maple Street",
        password: "alicepass",
        role: 0,
        createdAt: "2021-01-01T10:15:00.000Z",
        answer: "alice",
      },
      {
        name: "Bob Williams",
        email: "bob@example.com",
        phone: "987-654-3210",
        address: "456 Oak Avenue",
        password: "bobpass",
        role: 1,
        createdAt: "2021-06-15T18:30:00.000Z",
        answer: "bob",
      },
    ];
    await seedUsers(seededUsers);

    await navigateToUsersPage(page);

    await expect(
      page.getByRole("heading", { name: /all users/i })
    ).toBeVisible();

    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    const rows = await table.getByRole("row").count();
    expect(rows).toBeGreaterThanOrEqual(seededUsers.length + 1);

    for (const seeded of seededUsers) {
      const row = table.getByRole("row", {
        name: new RegExp(seeded.email, "i"),
      });
      await expect(row).toContainText(seeded.name);
      await expect(row).toContainText(seeded.phone);
      await expect(row).toContainText(seeded.address);
      await expect(row).toContainText(seeded.role === 1 ? "Admin" : "User");
      await expect(row).toContainText(formatAsMomentLLL(seeded.createdAt));
    }

    const adminRow = table.getByRole("row", {
      name: new RegExp(ADMIN_EMAIL, "i"),
    });
    await expect(adminRow).toContainText(ADMIN_NAME);
    await expect(adminRow).toContainText("Admin");
  });

  test("displays expected column headers", async ({ page }) => {
    await seedUsers([]);
    await navigateToUsersPage(page);

    const table = page.getByRole("table");
    const headers = [
      "#",
      "Name",
      "Email",
      "Phone",
      "Address",
      "Role",
      "Joined",
    ];

    for (const header of headers) {
      await expect(
        table.getByRole("columnheader", {
          name: new RegExp(`^${header}$`, "i"),
        })
      ).toBeVisible();
    }
  });

  test("navigates to create category via admin menu", async ({ page }) => {
    await navigateToUsersPage(page);

    const adminMenu = page.locator(".list-group");
    await expect(adminMenu).toBeVisible();

    await Promise.all([
      page.waitForURL("**/dashboard/admin/create-category"),
      adminMenu.getByRole("link", { name: /create category/i }).click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard\/admin\/create-category$/);
  });

  test("navigates to create product via admin menu", async ({ page }) => {
    await navigateToUsersPage(page);

    const adminMenu = page.locator(".list-group");
    await expect(adminMenu).toBeVisible();

    await Promise.all([
      page.waitForURL("**/dashboard/admin/create-product"),
      adminMenu.getByRole("link", { name: /create product/i }).click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard\/admin\/create-product$/);
  });

  test("navigates to products listing via admin menu", async ({ page }) => {
    await navigateToUsersPage(page);

    const adminMenu = page.locator(".list-group");
    await expect(adminMenu).toBeVisible();

    await Promise.all([
      page.waitForURL("**/dashboard/admin/products"),
      adminMenu.getByRole("link", { name: /^products$/i }).click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard\/admin\/products$/);
  });

  test("navigates to orders via admin menu", async ({ page }) => {
    await navigateToUsersPage(page);

    const adminMenu = page.locator(".list-group");
    await expect(adminMenu).toBeVisible();

    await Promise.all([
      page.waitForURL("**/dashboard/admin/orders"),
      adminMenu.getByRole("link", { name: /^orders$/i }).click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard\/admin\/orders$/);
  });
});
