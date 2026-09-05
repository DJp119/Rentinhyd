// e2e/map-reload-data.spec.ts
// Verifies that a submitted rent pin comes back from the map API after reload.

import { test, expect } from '@playwright/test';

async function dismissConsent(page: any) {
  const consentModal = page.locator('[data-testid="consent-modal"]');
  const consentBtn = page.locator('[data-testid="consent-accept"]');
  try {
    await consentModal.waitFor({ state: 'visible', timeout: 2000 });
    await consentBtn.click();
    // Wait for modal to be fully detached (not just hidden) to avoid intercepting clicks
    await consentModal.waitFor({ state: 'detached', timeout: 5000 });
  } catch {
    // consent modal did not appear or was already dismissed
  }
}

async function waitForMapLoad(page: any) {
  // Wait for Google Maps loading indicator to disappear (or error state)
  try {
    await page.locator('text=Loading Google Maps...').waitFor({ state: 'hidden', timeout: 15000 });
  } catch {
    // If it doesn't disappear, check for error state and continue
    const errorVisible = await page.locator('text=Failed to load map').isVisible().catch(() => false);
    if (errorVisible) {
      console.log('Google Maps failed to load (referer error), continuing test anyway');
    }
  }
  // Wait for pins loading indicator to disappear (if it appears)
  try {
    await page.locator('text=Loading pins...').waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // Pins might not show loading state if map failed
  }
  // Wait for map container to be ready
  await page.locator('[data-testid="map-container"]').waitFor({ state: 'visible', timeout: 10000 });

  // Give map a moment to initialize click handlers even if it errors
  await page.waitForTimeout(1000);
}

test('reload fetches the submitted pending rent pin and avoids duplicate markers', async ({ page }) => {
  const pinId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  let submitted = false;
  let mapRequestCount = 0;

  await page.route('**/api/rent-pins', async (route) => {
    if (route.request().method() === 'POST') {
      submitted = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: pinId,
          status: 'pending',
          message: 'Rent pin submitted and is now visible on the map.',
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.route('**/api/map*', async (route) => {
    mapRequestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: submitted
          ? [{
              id: pinId,
              type: 'rent_pin',
              geom: { type: 'Point', coordinates: [78.365, 17.44] },
              rentMin: 20000,
              rentMax: 30000,
              bhk: '2BHK',
              furnishing: 'semi_furnished',
              locality: 'gachibowli',
              pinCount: 1,
            }]
          : [],
        total: submitted ? 1 : 0,
        viewport: { bbox: [78.3, 17.35, 78.45, 17.55], zoom: 15 },
      }),
    });
  });

  await page.goto('/map', { waitUntil: 'domcontentloaded' });
  await dismissConsent(page);
  await waitForMapLoad(page);

  await page.locator('[data-testid="map-canvas"]').click({ position: { x: 300, y: 300 } });
  await page.locator('[data-testid="action-rent"]').click();
  await page.fill('[data-testid="pin-locality"]', 'gachibowli');
  await page.fill('[data-testid="pin-rent-min"]', '20000');
  await page.fill('[data-testid="pin-rent-max"]', '30000');
  await page.click('[data-testid="pin-submit"]');

  await expect(page.locator('[data-testid="rent-pin-marker"]').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="temporary-rent-pin"]')).toHaveCount(0);

  const requestsBeforeReload = mapRequestCount;
  await page.reload();
  await expect.poll(() => mapRequestCount).toBeGreaterThan(requestsBeforeReload);
  await expect(page.locator('[data-testid="rent-pin-marker"]').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="rent-pin-marker"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="temporary-rent-pin"]')).toHaveCount(0);
});
