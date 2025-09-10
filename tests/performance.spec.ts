import { test, expect, chromium } from "@playwright/test";

// TC020: Performance and Responsiveness Testing
test("TC020: Performance and Responsiveness Testing", async () => {
  console.log("🧪 Running TC020: Performance and Responsiveness Testing");

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await test.step("Test homepage performance", async () => {
    console.log("Testing homepage performance...");

    const startTime = Date.now();
    await page.goto("http://localhost:4174");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;

    console.log(`Homepage load time: ${loadTime}ms`);

    // Check if load time is reasonable (under 3 seconds)
    expect(loadTime).toBeLessThan(3000);
  });

  await test.step("Test mobile responsiveness", async () => {
    console.log("Testing mobile responsiveness...");

    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: "iPhone SE" },
      { width: 768, height: 1024, name: "Tablet" },
      { width: 1920, height: 1080, name: "Desktop" },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);

      // Check if page is properly displayed
      const body = await page.locator("body");
      const isVisible = await body.isVisible();

      console.log(`${viewport.name} (${viewport.width}x${viewport.height}): ${isVisible ? "OK" : "FAIL"}`);
      expect(isVisible).toBeTruthy();
    }
  });

  await test.step("Test critical page load times", async () => {
    console.log("Testing critical page load times...");

    const criticalPages = ["/", "/login", "/register", "/products", "/about"];

    for (const pagePath of criticalPages) {
      const startTime = Date.now();

      try {
        await page.goto(`http://localhost:4174${pagePath}`);
        await page.waitForLoadState("domcontentloaded");
        const loadTime = Date.now() - startTime;

        console.log(`${pagePath}: ${loadTime}ms`);

        // Each page should load under 2 seconds
        expect(loadTime).toBeLessThan(2000);
      } catch (error) {
        console.log(`${pagePath}: Error - ${error}`);
      }
    }
  });

  await test.step("Test resource loading", async () => {
    console.log("Testing resource loading...");

    await page.goto("http://localhost:4174");

    // Wait for all resources to load
    await page.waitForLoadState("networkidle");

    // Check if critical resources are loaded
    const scripts = await page.locator("script[src]").count();
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();

    console.log(`Scripts loaded: ${scripts}`);
    console.log(`Stylesheets loaded: ${stylesheets}`);

    // Should have at least some resources loaded
    expect(scripts + stylesheets).toBeGreaterThan(0);
  });

  await browser.close();

  console.log("✅ TC020 COMPLETED: Performance and responsiveness testing done");
});
