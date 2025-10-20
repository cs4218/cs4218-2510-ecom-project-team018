import { test, expect } from '@playwright/test';

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

  await page.getByRole('searchbox', { name: 'Search' }).fill('T shirt'); // note space, no dash
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
