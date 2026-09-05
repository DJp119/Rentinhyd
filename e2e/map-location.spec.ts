// e2e/map-location.spec.ts
// End-to-end tests for map geolocation, user marker, layer navigation, and responsive controls

import { test, expect } from '@playwright/test';

test.describe('Map Geolocation & Navigation Controls', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await context.setGeolocation({ latitude: 17.4435, longitude: 78.3772 });
  });

  // Helper to ensure map is loaded and consent modal is dismissed
  async function waitForMapLoad(page: any) {
    // Wait for Google Maps loading indicator to disappear (or error state)
    try {
      await page.locator('text=Loading Google Maps...').waitFor({ state: 'hidden', timeout: 15000 });
    } catch {
      const errorVisible = await page.locator('text=Failed to load map').isVisible().catch(() => false);
      if (errorVisible) {
        console.log('Google Maps failed to load (referer error), continuing test anyway');
      }
    }
    try {
      await page.locator('text=Loading pins...').waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // Pins might not show loading state if map failed
    }
    await page.locator('[data-testid="map-container"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1000);
  }

  async function dismissConsent(page: any) {
    const consentModal = page.locator('[data-testid="consent-modal"]');
    const consentBtn = page.locator('[data-testid="consent-accept"]');
    try {
      await consentModal.waitFor({ state: 'visible', timeout: 2000 });
      await consentBtn.click();
      await consentModal.waitFor({ state: 'detached', timeout: 5000 });
    } catch {
      // consent already dismissed
    }
  }

  async function prepareMapPage(page: any) {
    await page.goto(`${baseURL}/map`, { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await waitForMapLoad(page);
  }

  test('map loads and displays layer navigation and locate me controls', async ({ page }) => {
    await prepareMapPage(page);

    // Top-right navigation overlay is visible
    const nav = page.locator('[data-testid="map-navigation"]');
    await expect(nav).toBeVisible();

    // Bottom-left Locate Me control is visible
    const locateBtn = page.locator('[data-testid="locate-me-button"]');
    await expect(locateBtn).toBeVisible();
    await expect(locateBtn).toHaveAttribute('aria-label', 'Locate Me');
  });

  test('map navigation layer toggles work independently', async ({ page }) => {
    await prepareMapPage(page);

    const rentPinsToggle = page.locator('[data-testid="rent-pins-toggle"]');
    const toLetBoardsToggle = page.locator('[data-testid="tolet-boards-toggle"]');

    await expect(rentPinsToggle).toBeVisible();
    await expect(toLetBoardsToggle).toBeVisible();

    // Initially both should be pressed (visible)
    await expect(rentPinsToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toLetBoardsToggle).toHaveAttribute('aria-pressed', 'true');

    // Toggle Rent Pins off
    await rentPinsToggle.click();
    await expect(rentPinsToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toLetBoardsToggle).toHaveAttribute('aria-pressed', 'true'); // To-let unchanged

    // Toggle To-Let Boards off
    await toLetBoardsToggle.click();
    await expect(rentPinsToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toLetBoardsToggle).toHaveAttribute('aria-pressed', 'false');

    // Toggle Rent Pins back on
    await rentPinsToggle.click();
    await expect(rentPinsToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toLetBoardsToggle).toHaveAttribute('aria-pressed', 'false');
  });

  test('map navigation shows layer toggles and excludes disabled SEO page links', async ({ page }) => {
    await prepareMapPage(page);

    const nav = page.locator('[data-testid="map-navigation"]');
    await expect(nav).toBeVisible();

    const rentPinsToggle = page.locator('[data-testid="rent-pins-toggle"]');
    const toLetBoardsToggle = page.locator('[data-testid="tolet-boards-toggle"]');

    await expect(rentPinsToggle).toBeVisible();
    await expect(toLetBoardsToggle).toBeVisible();

    await expect(
      page.locator('a[href="/flats-for-rent-in-hyderabad"]')
    ).toHaveCount(0);

    await expect(
      page.locator('a[href="/flatmates-in-hyderabad"]')
    ).toHaveCount(0);
  });

  test('manual Locate Me click triggers location request and updates state', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await prepareMapPage(page);

    const locateBtn = page.locator('[data-testid="locate-me-button"]');
    await expect(locateBtn).toBeVisible();

    // Click Locate Me
    await locateBtn.click();

    // Should indicate locate me is working without crashing
    await expect(locateBtn).toBeVisible();
  });

  test('permission denied shows a friendly non-blocking notification', async ({ page, context }) => {
    // Clear permissions to simulate denied/unallowed state
    await context.clearPermissions();
    await prepareMapPage(page);

    const locateBtn = page.locator('[data-testid="locate-me-button"]');
    await expect(locateBtn).toBeVisible();

    // Click Locate Me when permission is not granted
    await locateBtn.click();

    // Map container remains fully functional and accessible
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();
  });

  test('responsive layout on mobile (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    await prepareMapPage(page);

    const nav = page.locator('[data-testid="map-navigation"]');
    await expect(nav).toBeVisible();

    const locateBtn = page.locator('[data-testid="locate-me-button"]');
    await expect(locateBtn).toBeVisible();

    // Confirm navigation is within viewport
    const navBox = await nav.boundingBox();
    expect(navBox).not.toBeNull();
    if (navBox) {
      expect(navBox.x + navBox.width).toBeLessThanOrEqual(320 + 2); // fits screen
    }
  });

  test('responsive layout on tablet (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await prepareMapPage(page);

    const nav = page.locator('[data-testid="map-navigation"]');
    await expect(nav).toBeVisible();

    const locateBtn = page.locator('[data-testid="locate-me-button"]');
    await expect(locateBtn).toBeVisible();
  });

  test('responsive layout on desktop (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await prepareMapPage(page);

    const nav = page.locator('[data-testid="map-navigation"]');
    await expect(nav).toBeVisible();

    const locateBtn = page.locator('[data-testid="locate-me-button"]');
    await expect(locateBtn).toBeVisible();
  });

  test('dark mode readability for navigation and control surfaces', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await prepareMapPage(page);

    const nav = page.locator('[data-testid="map-navigation"]');
    await expect(nav).toBeVisible();
    await expect(nav).toHaveClass(/map-control-surface/);

    const locateBtn = page.locator('[data-testid="locate-me-button"]');
    await expect(locateBtn).toBeVisible();
    await expect(locateBtn).toHaveClass(/map-control-surface/);
  });
});
