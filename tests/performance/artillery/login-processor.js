/**
 * Processor file for Artillery Playwright login test
 */

async function loginFlow(page) {
  // Test user credentials - defined inside function to avoid closure issues
  const TEST_USER = {
    email: "chu@gmail.com",
    password: "123456",
  };

  // Navigate to login page
  await page.goto("/login", { waitUntil: "networkidle" });

  // Wait for form to be ready
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });

  // Fill in login credentials
  const emailInput = page.getByRole("textbox", {
    name: /enter your email/i,
  });
  await emailInput.fill(TEST_USER.email);

  const passwordInput = page.getByRole("textbox", {
    name: /enter your password/i,
  });
  await passwordInput.fill(TEST_USER.password);

  // Wait for login API call to complete before submitting
  const loginPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/login") &&
      response.status() === 200,
    { timeout: 10000 }
  );

  // Submit login form
  await page.getByRole("button", { name: /login/i }).click();

  // Wait for API response - this ensures the backend call completes
  await loginPromise;

  // Verify successful login - wait for redirect to home page
  await page.waitForURL(/\/$/, { timeout: 10000 });

  // Verify user is logged in by checking login link is hidden
  const loginLink = page.getByRole("link", { name: /^login$/i });
  await loginLink.waitFor({ state: "hidden", timeout: 5000 });
}

module.exports = { loginFlow };

