import { test, expect } from '@playwright/test';

const CATEGORIES = ["Electronics", "Books", "Clothing"];

const PRICE_FILTERS = [
  "$0 to 19",
  "$20 to 39",
  "$40 to 59",
  "$60 to 79",
  "$80 to 99",
  "$100 or more",
];

test('Homepage loads correctly with Price, Category Filters and Products', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Page title
  await expect(page.getByText('All Products')).toBeVisible();

  // Check that there are exactly 6 products
  const products = page.getByTestId('product-name');
  await expect(products).toHaveCount(6);

  // Check categories using the constant
  for (const category of CATEGORIES) {
    await expect(page.getByRole('checkbox', { name: category })).toBeVisible();
  }

  // Check price filters using the constant
  for (const price of PRICE_FILTERS) {
    await expect(page.getByRole('radio', { name: price })).toBeVisible();
  }
});

test('filtering by category shows only selected category products', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Apply filter
  await page.getByRole('checkbox', { name: 'Clothing' }).check();

  // Wait until removed
  await expect(page.getByText('Smartphone')).toHaveCount(0);

  const productNames = await page.locator('[data-testid="product-name"]').allTextContents();
  //  Ensure expected clothing product is present
  expect(productNames).toContain('NUS T-shirt');

  // Ensure products from other categories are not present
  expect(productNames).not.toContain('Smartphone');
  expect(productNames).not.toContain('Laptop');
  expect(productNames).not.toContain('Novel');
});

test('filtering by price behaviour', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('radio', { name: '$40 to 59' }).check();

  // Wait until removed
  await expect(page.getByText('Smartphone')).toHaveCount(0);

  const productNames = await page.locator('[data-testid="product-name"]').allTextContents();

  //  Ensure expected product is present
  expect(productNames).toContain('The Law of Contract in Singapore');

  // Ensure products from other price ranges are NOT visible
  expect(productNames).not.toContain('Smartphone');
  expect(productNames).not.toContain('Laptop');
  expect(productNames).not.toContain('Novel');
  expect(productNames).not.toContain('NUS T-shirt');
});

test('filtering by price and category behaviour', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('main').getByText('Electronics').click();
  await page.getByText('$100 or more').click();

  // Wait until removed
  await expect(page.getByText('Novel')).toHaveCount(0);

  const productNames = await page.locator('[data-testid="product-name"]').allTextContents();
  //  Ensure expected product is present
  expect(productNames).toContain('Smartphone');
  expect(productNames).toContain('Laptop');

  // Ensure products from other price ranges and categories are NOT visible
  expect(productNames).not.toContain('The Law of Contract in Singapore');
  expect(productNames).not.toContain('NUS T-shirt');
  expect(productNames).not.toContain('Novel');
});

test('load more button shows more products when clicked', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  await expect(page.getByTestId('product-name')).toHaveCount(6);

  // Click Load More
  await page.getByRole('button', { name: /load more/i }).click();

  // Wait until there are more than 6 items
  await expect(page.getByTestId('product-name')).toHaveCount(7);
});

test('clicking more details shows the correct product data', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  const productCard = await page.locator('[data-testid="product-name"]').nth(1);
  const productName = productCard.textContent();
  const priceText = await page.locator('.card-price').nth(1).textContent();
  const descriptionText = await page.locator('.card-description').nth(1).textContent();

  await page.getByRole('button', { name: 'More Details' }).nth(1).click();

  await expect(page).toHaveURL(/\/product\//);

  await expect(page.getByTestId('product_detail_name', { hasText: productName })).toBeVisible();
  await expect(page.getByText(priceText)).toBeVisible();

  await expect(page.getByTestId('product_detail_description', { hasText: descriptionText})).toBeVisible();

  await expect(page.getByText(/category/i)).toBeVisible();

  await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible();
});


test('products add to cart can be verified at cart page', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  const productCard = page.locator('[data-testid="product-name"]').nth(1);
  
  const productName = await productCard.textContent();

  await page.getByRole('button', { name: /add to cart/i }).nth(1).click();
  await page.getByRole('link', { name: /cart/i }).click();

  await expect(page).toHaveURL('http://localhost:3000/cart');

  // Verify the product name is in the cart
  await expect(page.getByTestId('cart-product-name', { hasText: productName })).toBeVisible();
});

test('clicking reset filter button will show the original products', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // There should initially be 6 products
  await expect(page.getByTestId('product-name')).toHaveCount(6);

  // Apply category filter
  await page.getByRole('checkbox', { name: 'Electronics' }).check();

  // Apply price filter
  await page.getByRole('radio', { name: '$100 or more' }).check();

  // Wait until UI updates (filtered results)
  await expect(page.getByTestId('product-name')).not.toHaveCount(6);

  // Click RESET FILTERS button
  await page.getByRole('button', { name: 'RESET FILTERS' }).click();

  // Wait until the original product list is restored
  await expect(page.getByTestId('product-name')).toHaveCount(6);
});


