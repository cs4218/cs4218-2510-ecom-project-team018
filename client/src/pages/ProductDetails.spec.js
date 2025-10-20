/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from "../../../tests/playwrightTest.js";
import slugify from "slugify";
import categoryModel from "../../../models/categoryModel.js";
import productModel from "../../../models/productModel.js";
import userModel from "../../../models/userModel.js";
import { hashPassword } from "../../../helpers/authHelper.js";

const ADMIN_CREDENTIALS = {
  name: "Playwright Admin",
  email: "admin@example.com",
  password: "password",
  answer: "playwright",
};

const createCategory = async (name) => {
  const slug = slugify(name, { lower: true });
  return categoryModel.create({ name, slug });
};

const createProduct = async ({ name, slug, description, price, categoryId }) =>
  productModel.create({
    name,
    slug,
    description,
    price,
    category: categoryId,
    quantity: 10,
    shipping: false,
  });

const loginAsAdmin = async (page) => {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: /enter your email/i })
    .fill(ADMIN_CREDENTIALS.email);
  await page
    .getByRole("textbox", { name: /enter your password/i })
    .fill(ADMIN_CREDENTIALS.password);
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole("button", { name: /login/i }).click(),
  ]);
  await page.waitForLoadState("networkidle");
};

const resetDbAndSeedAdmin = async (page) => {
  await userModel.deleteMany({});
  await productModel.deleteMany({});
  await categoryModel.deleteMany({});

  await userModel.create({
    name: ADMIN_CREDENTIALS.name,
    email: ADMIN_CREDENTIALS.email,
    password: await hashPassword(ADMIN_CREDENTIALS.password),
    phone: "999-999-9999",
    address: "Playwright HQ",
    answer: ADMIN_CREDENTIALS.answer,
    role: 1,
  });

  await loginAsAdmin(page);
};
