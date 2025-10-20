/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from "../../../tests/playwrightTest.js";

const CONTACT_URL = "/contact";
const HERO_IMG_ALT = "contactus";
const HERO_IMG_SRC = "/images/contactus.jpeg";
const INTRO_TEXT =
  /For any query or info about product, feel free to call anytime. We are available 24x7./i;
const EMAIL_TEXT = /help@ecommerceapp\.com/i;
const PHONE_TEXT = /012-3456789/i;
const TOLL_FREE_TEXT = /1800-0000-0000 \(toll free\)/i;

test.beforeEach(async ({ page }) => {
  await page.goto(CONTACT_URL);
});

test.describe("Contact page", () => {
  test("renders document title and main heading", async ({ page }) => {
    await expect(page).toHaveTitle(/contact us/i);
    await expect(
      page.getByRole("heading", { level: 1, name: /contact us/i })
    ).toBeVisible();
  });

  test("displays hero image and support introduction", async ({ page }) => {
    const image = page.getByRole("img", { name: HERO_IMG_ALT });
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("src", HERO_IMG_SRC);

    await expect(page.getByText(INTRO_TEXT)).toBeVisible();
  });

  test.describe("contact channels", () => {
    test("shows support email, phone, and toll-free info", async ({ page }) => {
      await expect(page.getByText(EMAIL_TEXT)).toBeVisible();
      await expect(page.getByText(PHONE_TEXT)).toBeVisible();
      await expect(page.getByText(TOLL_FREE_TEXT)).toBeVisible();
    });
  });

  test.describe("navigation", () => {
    test("header Home link navigates to Home page", async ({ page }) => {
      const toggler = page.getByRole("button", { name: /toggle navigation/i });
      const homeLink = page.getByRole("link", { name: /^home$/i });

      await expect(async () => {
        if (!(await homeLink.isVisible())) {
          await toggler.click();
        }
        await expect(homeLink).toBeVisible();
      }).toPass();

      await Promise.all([
        page.waitForURL(
          (url) => url.pathname === "/" || url.pathname === "/index.html"
        ),
        homeLink.click(),
      ]);

      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole("link", { name: /virtual vault/i })
      ).toBeVisible();
    });

    test("footer Privacy Policy link navigates to policy page", async ({
      page,
    }) => {
      const footer = page.locator(".footer");
      await expect(footer).toBeVisible();

      await Promise.all([
        page.waitForURL("**/policy"),
        footer.getByRole("link", { name: /privacy policy/i }).click(),
      ]);

      await expect(page).toHaveURL(/\/policy$/);
    });

    test("footer About link routes to about page", async ({ page }) => {
      await Promise.all([
        page.waitForURL("**/about"),
        page
          .locator(".footer")
          .getByRole("link", { name: /^about$/i })
          .click(),
      ]);

      await expect(page).toHaveURL(/\/about$/);
    });

    test("footer Contact link keeps user on contact page", async ({ page }) => {
      const footer = page.locator(".footer");
      const contactLink = footer.getByRole("link", { name: /^contact$/i });
      await expect(contactLink).toHaveAttribute("href", "/contact");

      await Promise.all([page.waitForURL("**/contact"), contactLink.click()]);

      await expect(page).toHaveURL(/\/contact$/);
    });
  });
});
