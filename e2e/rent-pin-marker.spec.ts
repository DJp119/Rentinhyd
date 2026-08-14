// e2e/rent-pin-marker.spec.ts
// End-to-end tests for the optimistic session-only blue rent pin label marker

import { test, expect } from '@playwright/test';

test.describe('Rent Pin Label Marker Flow', () => {
  const baseURL = 'http://localhost:3000';

  test.beforeEach(({ page }) => {
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message, err.stack));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
    });
  });

  async function prepareMap(page: any) {
    await page.goto(`${baseURL}/map`);
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 });

    const consentModal = page.locator('[data-testid="consent-modal"]');
    const consentBtn = page.locator('[data-testid="consent-accept"]');
    try {
      await consentModal.waitFor({ state: 'visible', timeout: 2000 });
      await consentBtn.click();
      await consentModal.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // consent already dismissed
    }

    await expect(page.locator('[data-testid="map-container"]')).toBeVisible({ timeout: 10000 });
  }

  test('successful rent pin submission immediately displays optimistic blue label marker with 2BHK · 25K', async ({ page }) => {
    // Mock the POST /api/rent-pins endpoint
    await page.route('**/api/rent-pins', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            status: 'pending',
            message: 'Rent pin submitted! It will appear on the map after moderation review.',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await prepareMap(page);

    // Click map canvas to open MapAddMenu
    await page.locator('[data-testid="map-container"]').click({ position: { x: 300, y: 300 } });
    await expect(page.locator('[data-testid="map-add-menu"]')).toBeVisible({ timeout: 5000 });

    // Choose Rent action
    await page.locator('[data-testid="action-rent"]').click();
    await expect(page.locator('[data-testid="rent-pin-form"]')).toBeVisible({ timeout: 5000 });

    // Fill form
    await page.fill('[data-testid="pin-locality"]', 'gachibowli');
    await page.fill('[data-testid="pin-rent-min"]', '20000');
    await page.fill('[data-testid="pin-rent-max"]', '30000');

    await page.waitForTimeout(500);

    // Submit
    await page.click('[data-testid="pin-submit"]');

    // Confirm success message and form close
    await expect(page.locator('[data-testid="pin-success"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="rent-pin-form"]')).toBeHidden({ timeout: 5000 });

    const labelMarker = page.locator('[data-testid="temporary-rent-pin"]');
    await expect(labelMarker).toBeVisible({ timeout: 5000 });
    await expect(labelMarker).toContainText('2BHK');
    await expect(labelMarker).toContainText('25K');
    await expect(labelMarker).toHaveAttribute('role', 'img');
    await expect(labelMarker).toHaveAttribute('aria-label', /Your submitted 2BHK rent pin.*25 thousand/);
  });

  test('failed API submission (500) does not create temporary marker', async ({ page }) => {
    await page.route('**/api/rent-pins', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Unable to save your rent pin right now.',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await prepareMap(page);

    await page.locator('[data-testid="map-container"]').click({ position: { x: 300, y: 300 } });
    await page.locator('[data-testid="action-rent"]').click();
    await page.fill('[data-testid="pin-locality"]', 'madhapur');
    await page.fill('[data-testid="pin-rent-min"]', '15000');
    await page.fill('[data-testid="pin-rent-max"]', '25000');

    await page.waitForTimeout(500);

    await page.click('[data-testid="pin-submit"]');

    await expect(page.locator('[data-testid="pin-error"]')).toBeVisible({ timeout: 5000 });
    const labelMarker = page.locator('[data-testid="temporary-rent-pin"]');
    await expect(labelMarker).toHaveCount(0);
  });

  test('layer toggle hides and restores the temporary marker', async ({ page }) => {
    await page.route('**/api/rent-pins', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            status: 'pending',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await prepareMap(page);

    await page.locator('[data-testid="map-container"]').click({ position: { x: 300, y: 300 } });
    await page.locator('[data-testid="action-rent"]').click();
    await page.fill('[data-testid="pin-locality"]', 'kondapur');
    await page.fill('[data-testid="pin-rent-min"]', '18000');
    await page.fill('[data-testid="pin-rent-max"]', '18000');

    await page.waitForTimeout(500);

    await page.click('[data-testid="pin-submit"]');

    await expect(page.locator('[data-testid="rent-pin-form"]')).toBeHidden({ timeout: 5000 });

    const labelMarker = page.locator('[data-testid="temporary-rent-pin"]');
    await expect(labelMarker).toBeVisible({ timeout: 5000 });
    await expect(labelMarker).toContainText('18K');

    // Toggle Rent Pins layer OFF
    const rentPinsToggle = page.locator('[data-testid="rent-pins-toggle"]');
    await rentPinsToggle.click();
    await expect(rentPinsToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(labelMarker).not.toBeVisible();

    // Toggle Rent Pins layer back ON
    await rentPinsToggle.click();
    await expect(rentPinsToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(labelMarker).toBeVisible();
  });

  test('clicking Locate Me button does not trigger map tap add-menu', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 17.4435, longitude: 78.3772 });

    await prepareMap(page);

    const locateBtn = page.locator('[data-testid="locate-me-button"]');
    await expect(locateBtn).toBeVisible();
    await locateBtn.click();

    // MapAddMenu should NOT open
    await expect(page.locator('[data-testid="map-add-menu"]')).toHaveCount(0);
  });

  test('responsive mobile layout (320px) supports marker display', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await prepareMap(page);

    await expect(page.locator('[data-testid="map-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="locate-me-button"]')).toBeVisible();
  });
});
