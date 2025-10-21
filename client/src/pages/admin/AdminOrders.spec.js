import { test, expect } from "../../../../tests/playwrightTest.js";
import fs from "fs";
import path from "path";
import categoryModel from "../../../../models/categoryModel.js";
import userModel from "../../../../models/userModel.js";
import orderModel from "../../../../models/orderModel.js";
import productModel from "../../../../models/productModel.js";
import { hashPassword } from "../../../../helpers/authHelper.js";
import slugify from "slugify";

// admin test user credentials
const ADMIN_CREDENTIALS = {
  name: "Playwright Admin",
  email: "kenvynkwek@gmail.com",
  password: "password",
  phone: "12345678",
  address: "Playwright HQ",
  answer: "test",
  role: 1,
};

// sample categories
const SAMPLE_CATEGORIES = [
  { _id: "1", name: "Electronics" },
  { _id: "2", name: "Books" },
];

// sample products for orders
const SAMPLE_PRODUCTS = [
  {
    name: "Test Product 1",
    description: "A sample description 1",
    price: 50,
    quantity: 1,
  },
  {
    name: "Test Product 2",
    description: "A sample description 2",
    price: 30,
    quantity: 1,
  },
  {
    name: "Test Product 3",
    description: "A sample description 3",
    price: 20,
    quantity: 1,
  },
];

// seed an admin user
const seedAdminUser = async () => {
  const hashedPassword = await hashPassword(ADMIN_CREDENTIALS.password);
  await userModel.create({
    ...ADMIN_CREDENTIALS,
    password: hashedPassword,
  });
};

// seed baseline categories
const seedCategories = async () => {
  const docs = SAMPLE_CATEGORIES.map((cat) => ({
    name: cat.name,
    slug: slugify(cat.name, { lower: true }),
  }));
  await categoryModel.insertMany(docs);
  return await categoryModel.find(); // return all categories
};

// seed products with category and slug
const seedProducts = async () => {
  await categoryModel.deleteMany({});
  const categories = await seedCategories(); // ensure categories exist
  const category = categories[0]; // assign all products to first category

  const productsWithCategory = SAMPLE_PRODUCTS.map((p) => ({
    ...p,
    category: category._id,
    slug: slugify(p.name, { lower: true }),
    photo: {
      data: fs.readFileSync(
        path.join(process.cwd(), "client/public/images/placeholder.png")
      ),
      contentType: "image/png",
    },
  }));

  const docs = await productModel.insertMany(productsWithCategory);
  return docs;
};

// seed sample orders with explicit dates
const seedOrders = async (products, buyer) => {
  const now = new Date();

  // order1 has product1
  const order1 = await orderModel.create({
    products: [products[0]._id], // just the ObjectId
    buyer: buyer._id,
    payment: { success: true },
    status: "Not Processed",
    createdAt: new Date(now.getTime() - 1000 * 60 * 60), // 1 hour ago
  });

  // order2 has product2 and product3
  const order2 = await orderModel.create({
    products: [products[1]._id, products[2]._id],
    buyer: buyer._id,
    payment: { success: true },
    status: "Not Processed",
    createdAt: new Date(now.getTime() - 1000 * 60 * 30), // 30 minutes ago
  });

  return [order1, order2];
};

// login function
const loginAsAdmin = async (page) => {
  // navigate to the target page; app should redirect to /login
  await page.goto("/dashboard/admin/orders");

  // wait to be redirected
  await page.waitForURL("/login");

  // fill login form
  await page
    .getByRole("textbox", { name: "Enter Your Email" })
    .fill(ADMIN_CREDENTIALS.email);
  await page
    .getByRole("textbox", { name: "Enter Your Password" })
    .fill(ADMIN_CREDENTIALS.password);

  // submit
  await page.getByRole("button", { name: "LOGIN" }).click();

  // wait for redirect to admin orders page
  await page.waitForURL("/dashboard/admin/orders");

  // wait for orders API to complete
  await page.waitForResponse((res) =>
    res.url().includes("/api/v1/auth/all-orders")
  );
};

test.describe("Admin Orders Page", () => {
  let adminUser;

  // seed admin once
  test.beforeAll(async () => {
    await userModel.deleteMany({});
    await seedAdminUser();
    adminUser = await userModel.findOne({ email: ADMIN_CREDENTIALS.email });
  });

  // clear and seed before each test
  test.beforeEach(async ({ page }) => {
    await productModel.deleteMany({});
    await orderModel.deleteMany({});

    const products = await seedProducts();
    await seedOrders(products, adminUser); // 2 orders

    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await userModel.deleteMany({});
    await productModel.deleteMany({});
    await orderModel.deleteMany({});
  });

  test("should display all orders correctly", async ({ page }) => {
    // heading
    await expect(page.locator("h1")).toHaveText("All Orders");

    const orderRows = page.locator("table tbody tr");
    await expect(orderRows).toHaveCount(2);

    // helper for order row
    const checkOrderRow = async (
      row,
      index,
      expectedStatus,
      expectedBuyer,
      expectedPayment,
      expectedQuantity,
      expectedDateText
    ) => {
      await expect(row.locator("td").nth(0)).toHaveText((index + 1).toString());
      await expect(row.locator(".ant-select")).toHaveText(expectedStatus);
      await expect(row.locator("td").nth(2)).toHaveText(expectedBuyer);
      await expect(row.locator("td").nth(4)).toHaveText(expectedPayment);
      await expect(row.locator("td").nth(5)).toHaveText(
        expectedQuantity.toString()
      );
      await expect(row.locator("td").nth(3)).toHaveText(expectedDateText);
    };

    // check first order
    await checkOrderRow(
      orderRows.nth(0),
      0,
      "Not Processed",
      adminUser.name,
      "Success",
      2,
      "30 minutes ago"
    );

    // check second order
    await checkOrderRow(
      orderRows.nth(1),
      SAMPLE_PRODUCTS[0].quantity,
      "Not Processed",
      adminUser.name,
      "Success",
      1,
      "an hour ago"
    );

    // check product cards
    const orders = page.locator(".border.shadow"); // each order container
    await expect(orders).toHaveCount(2);

    // order1 has product1
    let cards = orders.nth(1).locator(".row.mb-2.p-3.card.flex-row");
    await expect(cards).toHaveCount(1);
    let product = SAMPLE_PRODUCTS[0];
    let card = cards.nth(0);
    await expect(card.locator("img")).toBeVisible();
    let paragraphs = card.locator("p");
    await expect(paragraphs.nth(0)).toHaveText(product.name);
    await expect(paragraphs.nth(1)).toHaveText(product.description);
    await expect(paragraphs.nth(2)).toHaveText(`Price : ${product.price}`);

    // order2 has product2 and product3
    cards = orders.nth(0).locator(".row.mb-2.p-3.card.flex-row");
    await expect(cards).toHaveCount(2);

    // Product 2
    product = SAMPLE_PRODUCTS[1];
    card = cards.nth(0);
    await expect(card.locator("img")).toBeVisible();
    paragraphs = card.locator("p");
    await expect(paragraphs.nth(0)).toHaveText(product.name);
    await expect(paragraphs.nth(1)).toHaveText(product.description);
    await expect(paragraphs.nth(2)).toHaveText(`Price : ${product.price}`);

    // Product 3
    product = SAMPLE_PRODUCTS[2];
    card = cards.nth(1);
    await expect(card.locator("img")).toBeVisible();
    paragraphs = card.locator("p");
    await expect(paragraphs.nth(0)).toHaveText(product.name);
    await expect(paragraphs.nth(1)).toHaveText(product.description);
    await expect(paragraphs.nth(2)).toHaveText(`Price : ${product.price}`);
  });

  test("should update order status successfully", async ({ page }) => {
    const select = page.locator(".ant-select").first();
    await select.click();

    // scope to the dropdown
    const dropdownOption = page
      .locator(".ant-select-dropdown .ant-select-item")
      .filter({
        hasText: "Processing",
      });
    await dropdownOption.click();

    // wait for orders API to refresh after update
    await page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/auth/order-status") && res.status() === 200
    );

    await expect(select.locator(".ant-select-selection-item")).toHaveText(
      "Processing"
    );
  });
});
