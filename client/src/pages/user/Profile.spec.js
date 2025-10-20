import { test, expect } from '@playwright/test';

const EMAIL = 'brendansoh@gmail.com';
const OLD_PASSWORD = 'Password';
const NEW_PASSWORD = 'Password123';
const ORIGINAL_PHONE = '83689219';
const UPDATED_PHONE = '9000000';
const ORIGINAL_NAME = 'brendan';
const UPDATED_NAME = 'brendan1';
const ORIGINAL_ADDRESS = 'kent ridge';
const UPDATED_ADDRESS = 'nus';

// ✅ Helper: Login Function
const login = async (page, email, password) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(password);
  await page.getByRole('button', { name: 'LOGIN' }).click();
};

const goToProfile = async (page, name) => {
  const userButton = page.getByRole('button', { name: new RegExp(name, 'i') });
  await expect(userButton).toBeVisible({ timeout: 15000 });

  await userButton.click();

};


test('renders profile page for logged in user', async ({ page }) => {
  await login(page, EMAIL, OLD_PASSWORD);
  await page.getByRole('button', { name: ORIGINAL_NAME }).click();
  await page.getByRole('link', { name: /Dashboard/i }).click();
  await page.getByRole('link', { name: /Profile/i }).click();
  
  // Assert fields are pre-filled
  await expect(page.getByPlaceholder('Enter Your Name')).toHaveValue(ORIGINAL_NAME);
  await expect(page.getByPlaceholder('Enter Your Email')).toHaveValue(EMAIL);
  await expect(page.getByPlaceholder('Enter Your Phone')).toHaveValue(ORIGINAL_PHONE);
  await expect(page.getByPlaceholder('Enter Your Address')).toHaveValue(ORIGINAL_ADDRESS);

  // Email field should be disabled
  await expect(page.getByPlaceholder('Enter Your Email')).toBeDisabled();
});

test('redirects to home page if user is not logged in', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard/user/profile');
  // Add an assertion based on your redirect logic (e.g., URL or toast)
  await expect(page).toHaveURL('http://localhost:3000/');
});

test.describe.serial('Profile Update Flow', () => {
  test('update profile successfully', async ({ page }) => {
    await login(page, EMAIL, OLD_PASSWORD);
    await page.getByRole('button', { name: ORIGINAL_NAME }).click();
    await page.getByRole('link', { name: /Dashboard/i }).click();
    await page.getByRole('link', { name: /Profile/i }).click();

    await page.getByPlaceholder('Enter Your Name').fill(UPDATED_NAME);
    await page.getByPlaceholder('Enter Your Password').fill(NEW_PASSWORD);
    await page.getByPlaceholder('Enter Your Phone').fill(UPDATED_PHONE);
    await page.getByPlaceholder('Enter Your Address').fill(UPDATED_ADDRESS);
    await page.getByRole('button', { name: 'UPDATE' }).click();

    // ✅ Assert success toast
    await expect(page.getByText('Profile Updated Successfully')).toBeVisible();

    // ✅ Assert form updated
    await expect(page.getByPlaceholder('Enter Your Name')).toHaveValue(UPDATED_NAME);
    await expect(page.getByPlaceholder('Enter Your Phone')).toHaveValue(UPDATED_PHONE);
    await expect(page.getByPlaceholder('Enter Your Address')).toHaveValue(UPDATED_ADDRESS);
    await expect(page.getByPlaceholder('Enter Your Email')).toHaveValue(EMAIL);
  });

  test('unable to log in with old password', async ({ page }) => {
    await login(page, EMAIL, OLD_PASSWORD);
    // ✅ Expect login failure toast or remain on login page
    await expect(page.getByText('Something went wrong')).toBeVisible();
  });

  test('able to login with new password', async ({ page }) => {
    await login(page, EMAIL, NEW_PASSWORD);

    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('cleanup: reset profile to original', async ({ page }) => {
    await login(page, EMAIL, NEW_PASSWORD);
    await page.getByRole('button', { name: UPDATED_NAME }).click();
    await page.getByRole('link', { name: /Dashboard/i }).click();
    await page.getByRole('link', { name: /Profile/i }).click();

    await page.getByPlaceholder('Enter Your Name').fill(ORIGINAL_NAME);
    await page.getByPlaceholder('Enter Your Password').fill(OLD_PASSWORD);
    await page.getByPlaceholder('Enter Your Phone').fill(ORIGINAL_PHONE);
    await page.getByPlaceholder('Enter Your Address').fill(ORIGINAL_ADDRESS);
    await page.getByRole('button', { name: 'UPDATE' }).click();

    await expect(page.getByText('Profile Updated Successfully')).toBeVisible();
  });

});

test('profile will not be updated if password is less than 6 characters', async ({ page }) => {
  await login(page, EMAIL, OLD_PASSWORD);
  await page.getByRole('button', { name: ORIGINAL_NAME }).click();
  await page.getByRole('link', { name: /Dashboard/i }).click();
  await page.getByRole('link', { name: /Profile/i }).click();

  await page.getByPlaceholder('Enter Your Password').fill('short');
  await page.getByRole('button', { name: 'UPDATE' }).click();

  // ✅ Assert correct toast
  await expect(page.getByText('Password must be at least 6 characters long')).toBeVisible();
});
