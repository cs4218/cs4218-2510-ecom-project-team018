/**
 * Processor file for Artillery Playwright capacity tests
 */

// Helper function to generate unique email
function generateUniqueEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `artillery_${timestamp}_${random}@test.com`;
}

// Helper function to generate random search terms (fuzzing)
function getRandomSearchTerm() {
  const searchTerms = [
    "T-shirt",
    "T",
    "phone",
    "laptop",
    "book",
    "contract",
    "smart",
    "NUS",
    "law",
    "novel",
    "electronics",
    "clothing",
    "books",
    "shirt",
    "computer",
    "device",
    "product",
    "item",
    "test",
    "search",
    "random",
    "query",
    "keyword",
    "term",
  ];
  return searchTerms[Math.floor(Math.random() * searchTerms.length)];
}

// Flow 1: Login (inspired by Login.spec.js - successful login)
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

// Flow 2: Register (inspired by Register.spec.js - successful registration)
async function registerFlow(page) {
  // Generate unique user data to avoid duplicates
  const uniqueEmail = generateUniqueEmail();
  const TEST_USER = {
    name: `Test User ${Date.now()}`,
    email: uniqueEmail,
    password: "testpassword123",
    phone: `123456${Math.floor(Math.random() * 10000)}`,
    address: "123 Test Street",
    DOB: "1990-01-01",
    answer: "Football",
  };

  // Navigate to register page
  await page.goto("/register", { waitUntil: "networkidle" });

  // Wait for form to be ready
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });

  // Fill in registration form
  await page
    .getByRole("textbox", { name: /enter your name/i })
    .fill(TEST_USER.name);
  await page
    .getByRole("textbox", { name: /enter your email/i })
    .fill(TEST_USER.email);
  await page
    .getByRole("textbox", { name: /enter your password/i })
    .fill(TEST_USER.password);
  await page
    .getByRole("textbox", { name: /enter your phone/i })
    .fill(TEST_USER.phone);
  await page
    .getByRole("textbox", { name: /enter your address/i })
    .fill(TEST_USER.address);
  await page.locator('input[type="date"]').fill(TEST_USER.DOB);
  await page
    .getByRole("textbox", { name: /what is your favorite sports/i })
    .fill(TEST_USER.answer);

  // Wait for register API call to complete
  const registerPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/register") &&
      response.status() === 200,
    { timeout: 10000 }
  );

  // Submit registration form
  await page.getByRole("button", { name: /register/i }).click();

  // Wait for API response
  await registerPromise;

  // Verify successful registration - should redirect to login page
  await page.waitForURL(/\/login$/, { timeout: 10000 });
}

// Flow 3: Search (inspired by Search.spec.js - with fuzzing)
async function searchFlow(page) {
  // Navigate to homepage
  await page.goto("/", { waitUntil: "networkidle" });

  // Wait for search box to be ready
  await page.waitForSelector('input[type="search"]', { timeout: 5000 });

  // Generate random search term (fuzzing)
  const searchTerm = getRandomSearchTerm();

  // Fill search box
  const searchBox = page.getByRole("searchbox", { name: /search/i });
  await searchBox.fill(searchTerm);

  // Wait for search API call
  const searchPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/product/search/") &&
      response.status() === 200,
    { timeout: 10000 }
  );

  // Click search button
  await page.getByRole("button", { name: /search/i }).click();

  // Wait for API response
  await searchPromise;

  // Verify redirect to search page
  await page.waitForURL(/\/search$/, { timeout: 10000 });

  // Wait for search results to load
  await page.waitForSelector(".card, .no-products", { timeout: 5000 });
}

// Flow 4: Homepage Browse (inspired by HomePage.spec.js - successful interactions)
async function homepageFlow(page) {
  // Navigate to homepage
  await page.goto("/", { waitUntil: "networkidle" });

  // Wait for products to load
  await page.waitForSelector('[data-testid="product-name"]', {
    timeout: 10000,
  });

  // Wait for product list API
  await page
    .waitForResponse(
      (response) =>
        response.url().includes("/api/v1/product/product-list/") &&
        response.status() === 200,
      { timeout: 10000 }
    )
    .catch(() => {
      // API might have already completed, continue
    });

  // Randomly choose an action: view product details or add to cart
  const action = Math.random() > 0.5 ? "view" : "addToCart";

  if (action === "view") {
    // View product details (inspired by "clicking more details" test)
    const productCount = await page
      .locator('[data-testid="product-name"]')
      .count();
    if (productCount > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(productCount, 3));
      const moreDetailsButtons = page.getByRole("button", {
        name: /more details/i,
      });
      const buttonCount = await moreDetailsButtons.count();
      if (buttonCount > randomIndex) {
        await moreDetailsButtons.nth(randomIndex).click();
        await page.waitForURL(/\/product\//, { timeout: 10000 });
        // Wait a bit then go back
        await page.waitForTimeout(1000);
        await page.goBack();
        await page.waitForURL(/\/$/, { timeout: 5000 });
      }
    }
  } else {
    // Add to cart (inspired by "products add to cart" test)
    const productCount = await page
      .locator('[data-testid="product-name"]')
      .count();
    if (productCount > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(productCount, 3));
      const addToCartButtons = page.getByRole("button", {
        name: /add to cart/i,
      });
      const buttonCount = await addToCartButtons.count();
      if (buttonCount > randomIndex) {
        // Wait for add to cart API
        const addToCartPromise = page
          .waitForResponse(
            (response) =>
              response.url().includes("/api/v1/product/cart") &&
              response.status() === 200,
            { timeout: 5000 }
          )
          .catch(() => {
            // API might not be called if user is not logged in, continue
          });

        await addToCartButtons.nth(randomIndex).click();
        await addToCartPromise;
        await page.waitForTimeout(500);
      }
    }
  }
}

module.exports = {
  loginFlow,
  registerFlow,
  searchFlow,
  homepageFlow,
};
