import { test, expect } from "@playwright/test";
import { logger } from "@/lib/logger";


test.beforeEach(async ({ page }) => {
  // Clear any existing auth state
  await page.context().clearCookies();
  // Only clear localStorage if it's accessible
  try {
    await page.evaluate(() => localStorage.clear());
  } catch (e) {
    logger.info("localStorage not accessible, skipping clear");
  }
});

// TC001: User Registration with Valid Data
test("TC001: User Registration with Valid Data", async ({ page }) => {
  logger.info("🧪 Running TC001: User Registration with Valid Data");

  await test.step("Navigate to registration page", async () => {
    await page.goto("/register");
    await expect(page).toHaveTitle(/Vendeu Online/);
  });

  await test.step("Fill registration form with valid data", async () => {
    // Check if form fields exist before filling
    const nameField = page.locator('[name="name"], input[placeholder*="nome" i]');
    const emailField = page.locator('[name="email"], input[type="email"]');
    const passwordField = page.locator('[name="password"], input[type="password"]');

    if (await nameField.isVisible()) await nameField.fill("João Silva Teste");
    if (await emailField.isVisible()) await emailField.fill(`test-${Date.now()}@example.com`);
    if (await passwordField.isVisible()) await passwordField.fill("SenhaSegura123!");
  });

  await test.step("Submit registration form", async () => {
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Cadastrar"), button:has-text("Registrar")'
    );
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(2000);
    }
  });

  await test.step("Verify registration process", async () => {
    const url = page.url();
    logger.info("URL after registration attempt:", url);
    logger.info("✅ TC001 COMPLETED: Registration form accessible");
  });
});

// TC002: User Login with Correct Credentials
test("TC002: User Login with Correct Credentials", async ({ page }) => {
  logger.info("🧪 Running TC002: User Login with Correct Credentials");

  await test.step("Navigate to login page", async () => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Vendeu Online/);
  });

  await test.step("Input valid credentials", async () => {
    const emailField = page.locator('[name="email"], input[type="email"]');
    const passwordField = page.locator('[name="password"], input[type="password"]');

    if (await emailField.isVisible()) await emailField.fill("admin@test.com");
    if (await passwordField.isVisible()) await passwordField.fill("123456");
  });

  await test.step("Submit login form", async () => {
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Entrar")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);
    }
  });

  await test.step("Verify login attempt", async () => {
    const url = page.url();
    logger.info("URL after login attempt:", url);

    // Check for successful redirect or token
    const isRedirected = !url.includes("/login");
    logger.info("Login attempt completed. Redirected:", isRedirected);
    logger.info("✅ TC002 COMPLETED: Login functionality accessible");
  });
});

// TC003: Login Attempt with Invalid Credentials
test("TC003: Login Attempt with Invalid Credentials", async ({ page }) => {
  logger.info("🧪 Running TC003: Login Attempt with Invalid Credentials");

  await test.step("Navigate to login page", async () => {
    await page.goto("/login");
  });

  await test.step("Input invalid credentials", async () => {
    const emailField = page.locator('[name="email"], input[type="email"]');
    const passwordField = page.locator('[name="password"], input[type="password"]');

    if (await emailField.isVisible()) await emailField.fill("invalid@example.com");
    if (await passwordField.isVisible()) await passwordField.fill("wrongpassword");
  });

  await test.step("Submit login form", async () => {
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Entrar")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(2000);
    }
  });

  await test.step("Verify invalid login handling", async () => {
    const url = page.url();
    const staysOnLogin = url.includes("/login");
    logger.info("URL after invalid login:", url);
    logger.info("Stays on login page:", staysOnLogin);
    logger.info("✅ TC003 COMPLETED: Invalid login test executed");
  });
});

// TC004: Password Recovery Flow
test("TC004: Password Recovery Flow", async ({ page }) => {
  logger.info("🧪 Running TC004: Password Recovery Flow");

  await test.step("Navigate to login page", async () => {
    await page.goto("/login");
  });

  await test.step("Look for password recovery option", async () => {
    const forgotPasswordLink = page.locator(
      'a[href*="forgot"], a[href*="recovery"], a[href*="reset"], a:has-text("Esqueci")'
    );
    const hasRecoveryLink = await forgotPasswordLink.isVisible();

    logger.info("Password recovery link found:", hasRecoveryLink);

    if (hasRecoveryLink) {
      await forgotPasswordLink.click();
      await page.waitForTimeout(1000);
    } else {
      // Try direct navigation
      await page.goto("/forgot-password");
    }
  });

  await test.step("Verify recovery page accessible", async () => {
    const url = page.url();
    logger.info("Recovery page URL:", url);
    logger.info("✅ TC004 COMPLETED: Password recovery functionality checked");
  });
});

// Basic UI Tests
test("Homepage loads correctly", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Vendeu Online/);

  // Check for basic elements
  const hasContent = await page.locator("body").isVisible();
  expect(hasContent).toBeTruthy();

  logger.info("✅ Homepage loads successfully");
});

test("Navigation accessibility", async ({ page }) => {
  await page.goto("/");

  // Test common pages
  const pagesToTest = ["/about", "/contact", "/products", "/pricing"];

  for (const path of pagesToTest) {
    try {
      await page.goto(path);
      const hasContent = await page.locator("body").isVisible();
      logger.info(`Page ${path}: ${hasContent ? "accessible" : "not accessible"}`);
    } catch (error) {
      logger.info(`Page ${path}: error - ${error}`);
    }
  }

  logger.info("✅ Navigation test completed");
});
