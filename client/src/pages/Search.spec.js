import { test, expect } from '../../../tests/playwrightTest';
import Category from '../../../models/categoryModel';
import Product from '../../../models/productModel';

const seedData = async () => {
  await Category.deleteMany({});
  await Product.deleteMany({});
  const categories = await Category.insertMany([
    { name: "Electronics", slug: "electronics" },
    { name: "Clothing", slug: "clothing" },
    { name: "Books", slug: "books" },
  ]);

  await Product.insertMany([
    { name: "Smartphone", slug: "smartphone", description: "A high-end smartphone", price: 999, category: categories[0]._id, quantity: 10 },
    { name: "Laptop", slug: "laptop", description: "Powerful laptop", price: 1299, category: categories[0]._id, quantity: 10 },
    { name: "NUS T-shirt", slug: "nus-tshirt", description: "Plain NUS T-shirt for sale", price: 25, category: categories[1]._id, quantity: 10 },
    { name: "The Law of Contract in Singapore", slug: "contract-book", description: "Law book", price: 50, category: categories[2]._id, quantity: 10 },
  ]);
};

test.beforeEach(async () => {
  await seedData();
});


test('search page returns 1 product based on search term', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  await page.getByRole('searchbox', { name: 'Search' }).fill('T-shirt');
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page).toHaveURL('http://localhost:3000/search');

  // Assert "Found 1"
  await expect(page.getByText('Found 1')).toBeVisible();

  // Assert exactly 1 card rendered
  await expect(page.locator('.card')).toHaveCount(1);
});


test('search page returns 0 products', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  await page.getByRole('searchbox', { name: 'Search' }).fill('blah blah blah');
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page).toHaveURL('http://localhost:3000/search');

  // Assert "No Products Found" message
  await expect(page.getByText('No Products Found')).toBeVisible();

  // Ensure no product cards displayed
  await expect(page.locator('.card')).toHaveCount(0);
});

test('search page returns multiple products', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Partial keyword that matches several products 
  await page.getByRole('searchbox', { name: 'Search' }).fill('T');
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page).toHaveURL('http://localhost:3000/search');

  // Assert "Found X" where X >= 2
  const foundText = await page.getByText(/Found \d+/).textContent();
  const count = parseInt(foundText.replace('Found ', ''), 10);
  expect(count).toBeGreaterThan(1);

  // Assert multiple product cards are shown
  await expect(page.locator('.card')).toHaveCount(count);
});