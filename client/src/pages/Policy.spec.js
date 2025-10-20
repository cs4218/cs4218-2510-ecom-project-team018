/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from "../../../tests/playwrightTest.js";

const POLICY_URL = "/policy";
const HERO_IMG_ALT = "privacy";
const HERO_IMG_SRC = "/images/contactus.jpeg";
const INTRO_TEXT =
  /We value your privacy and are committed to protecting your personal information./i;
const SECTION_HEADINGS = [
  "Information We Collect",
  "How We Use Your Information",
  "Cookies",
  "Third-Party Services",
  "Data Security",
  "Your Rights",
  "Changes to This Policy",
  "Contact Us",
];

test.beforeEach(async ({ page }) => {
  await page.goto(POLICY_URL);
});

test.describe("Policy page", () => {
  test("renders document title and main heading", async ({ page }) => {
    await expect(page).toHaveTitle(/privacy policy/i);
    await expect(
      page.getByRole("heading", { level: 3, name: /privacy policy/i })
    ).toBeVisible();
  });

  test("displays hero image and introductory copy", async ({ page }) => {
    const image = page.getByRole("img", { name: HERO_IMG_ALT });
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("src", HERO_IMG_SRC);

    await expect(page.getByText(INTRO_TEXT)).toBeVisible();
  });

  test("shows each policy section heading", async ({ page }) => {
    for (const heading of SECTION_HEADINGS) {
      await expect(
        page.getByRole("heading", { level: 5, name: new RegExp(heading, "i") })
      ).toBeVisible();
    }
  });

  test("inline Contact Us link navigates to the Contact page", async ({
    page,
  }) => {
    const contactLink = page.getByRole("link", { name: /contact us/i });
    await expect(contactLink).toHaveAttribute("href", "/contact");

    await Promise.all([page.waitForURL("**/contact"), contactLink.click()]);

    await expect(page).toHaveURL(/\/contact$/);
  });

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

  test("footer Contact link navigates to Contact page", async ({ page }) => {
    const footer = page.locator(".footer");
    await expect(footer).toBeVisible();

    await Promise.all([
      page.waitForURL("**/contact"),
      footer.getByRole("link", { name: /^contact$/i }).click(),
    ]);

    await expect(page).toHaveURL(/\/contact$/);
  });

  test("footer About link routes to About page", async ({ page }) => {
    await Promise.all([
      page.waitForURL("**/about"),
      page
        .locator(".footer")
        .getByRole("link", { name: /^about$/i })
        .click(),
    ]);

    await expect(page).toHaveURL(/\/about$/);
  });

  test("privacy policy footer link keeps user on policy page", async ({
    page,
  }) => {
    const footer = page.locator(".footer");
    const policyLink = footer.getByRole("link", { name: /privacy policy/i });
    await expect(policyLink).toHaveAttribute("href", "/policy");

    await Promise.all([page.waitForURL("**/policy"), policyLink.click()]);

    await expect(page).toHaveURL(/\/policy$/);
  });
});
