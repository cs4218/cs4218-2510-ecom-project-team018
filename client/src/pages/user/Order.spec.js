import { test, expect } from '../../../../tests/playwrightTest';
import User from '../../../../models/userModel.js';
import Product from '../../../../models/productModel.js';
import Category from '../../../../models/categoryModel.js';
import Order from '../../../../models/orderModel.js';
import bcrypt from 'bcryptjs';

const seedOrdersData = async () => {
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Order.deleteMany({}),
  ]);

  const hashedPassword = await bcrypt.hash('Password', 10);
  const user = await User.create({
    name: 'brendan',
    email: 'brendansoh@gmail.com',
    password: hashedPassword,
    phone: '83689219',
    address: 'kent ridge',
    role: 0,
    answer: 'nus'
  });

  const categories = await Category.insertMany([
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Books', slug: 'books' },
    { name: 'Clothing', slug: 'clothing' },
  ]);

  const products = await Product.insertMany([
    { name: 'Smartphone', slug: 'smartphone', description: 'High-end phone', price: 999, category: categories[0]._id, quantity: 10 },
    { name: 'Laptop', slug: 'laptop', description: 'Laptop computer', price: 1299, category: categories[0]._id, quantity: 10 },
    { name: 'NUS T-shirt', slug: 'nus-tshirt', description: 'NUS tee', price: 25, category: categories[2]._id, quantity: 10 },
    { name: 'Novel', slug: 'novel', description: 'Interesting book', price: 10, category: categories[1]._id, quantity: 10 },
  ]);

  await Order.create({
    products: [products[0]._id, products[2]._id],
    payment: { success: true },
    buyer: user._id,
    status: 'Delivered',
  });
};

test.beforeEach(async () => {
  await seedOrdersData();
});

test('Orders page renders with user order for logged in user', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('brendansoh@gmail.com');
  await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('Password');
  await page.getByRole('button', { name: 'LOGIN' }).click();

  // Navigate to Orders page
  await page.getByRole('button', { name: 'brendan' }).click();
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await page.getByRole('link', { name: 'Orders' }).click();

  // Assertions
  await expect(page).toHaveURL('http://localhost:3000/dashboard/user/orders');
  await expect(page.getByTestId('order_index')).toHaveText('1');
  await expect(page.getByTestId('order_status')).toHaveText(/Delivered/i);
  await expect(page.getByTestId('order_buyer_name')).toHaveText('brendan');
  await expect(page.getByTestId('order_payment_success')).toHaveText(/Success/i);
  await expect(page.getByTestId('order_product_length')).toHaveText('2');

  // Check product names within the order
  await expect(page.getByText('Smartphone')).toBeVisible();
  await expect(page.getByText('NUS T-shirt')).toBeVisible();
});


test('Orders page will redirect to home page for not logged in users', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard/user/orders');
  await expect(page).toHaveURL('http://localhost:3000/');
});


test('adding an item to cart and making payment will create one more order with 1 product', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('brendansoh@gmail.com');
  await page.getByRole('textbox', { name: 'Enter Your Password' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('Password');
  await page.getByRole('button', { name: 'LOGIN' }).click();
  await page.getByRole('button', { name: 'brendan' }).click();
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await page.getByRole('link', { name: 'Orders' }).click();
  await page.getByRole('link', { name: 'Home' }).click();
  await page.locator('div:nth-child(2) > .card-body > div:nth-child(3) > button:nth-child(2)').click();
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('button', { name: 'Paying with Card' }).click();
  await page.locator('iframe[name="braintree-hosted-field-number"]').contentFrame().getByRole('textbox', { name: 'Credit Card Number' }).click();
  await page.locator('iframe[name="braintree-hosted-field-number"]').contentFrame().getByRole('textbox', { name: 'Credit Card Number' }).fill('3714 496353 98431');
  await page.locator('iframe[name="braintree-hosted-field-expirationDate"]').contentFrame().getByRole('textbox', { name: 'Expiration Date' }).click();
  await page.locator('iframe[name="braintree-hosted-field-expirationDate"]').contentFrame().getByRole('textbox', { name: 'Expiration Date' }).fill('0130');
  await page.locator('iframe[name="braintree-hosted-field-cvv"]').contentFrame().getByRole('textbox', { name: 'CVV' }).click();
  await page.locator('iframe[name="braintree-hosted-field-cvv"]').contentFrame().getByRole('textbox', { name: 'CVV' }).fill('1234');
  await page.getByRole('button', { name: 'Make Payment' }).click();

  //Asert URL is now at orders
  await expect(page).toHaveURL(/\/dashboard\/user\/orders/);

  // Assert order count increased by 1
  await page.waitForSelector('[data-testid="order_index"]', { state: 'visible' });
  const orders = await page.getByTestId('order_index').allTextContents();
  expect(orders.length).toBe(2);
});

test('adding multiple items to cart and making payment will create multiple orders', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('brendansoh@gmail.com');
  await page.getByRole('textbox', { name: 'Enter Your Password' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('Password');
  await page.getByRole('button', { name: 'LOGIN' }).click();
  await page.getByRole('link', { name: 'Home' }).click();
  await page.locator('div:nth-child(2) > .card-body > div:nth-child(3) > button:nth-child(2)').click();
  await page.locator('div:nth-child(1) > .card-body > div:nth-child(3) > button:nth-child(2)').click();
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('button', { name: 'Paying with Card' }).click();
  await page.locator('iframe[name="braintree-hosted-field-number"]').contentFrame().getByRole('textbox', { name: 'Credit Card Number' }).click();
  await page.locator('iframe[name="braintree-hosted-field-number"]').contentFrame().getByRole('textbox', { name: 'Credit Card Number' }).fill('3714 496353 98431');
  await page.locator('iframe[name="braintree-hosted-field-expirationDate"]').contentFrame().getByRole('textbox', { name: 'Expiration Date' }).click();
  await page.locator('iframe[name="braintree-hosted-field-expirationDate"]').contentFrame().getByRole('textbox', { name: 'Expiration Date' }).fill('0130');
  await page.locator('iframe[name="braintree-hosted-field-cvv"]').contentFrame().getByRole('textbox', { name: 'CVV' }).click();
  await page.locator('iframe[name="braintree-hosted-field-cvv"]').contentFrame().getByRole('textbox', { name: 'CVV' }).fill('1234');
  await page.getByRole('button', { name: 'Make Payment' }).click();

  //Asert URL is now at orders
  await expect(page).toHaveURL("http://localhost:3000/dashboard/user/orders");

  // Assert new order created and has 2 products
  const quantities = await page.getByTestId('order_product_length').allTextContents();
  const lastOrderQty = quantities[quantities.length - 1];
  expect(Number(lastOrderQty)).toBe(2);
});