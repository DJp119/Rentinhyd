// e2e/map-reload-data.spec.ts
// Verifies that a submitted rent pin comes back from the map API after reload.

import { test, expect } from '@playwright/test';

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

  await page.goto('http://localhost:3000/map');
  await page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 });

  const consentModal = page.locator('[data-testid="consent-modal"]');
  if (await consentModal.isVisible().catch(() => false)) {
    await page.locator('[data-testid="consent-accept"]').click();
  }

  await page.locator('[data-testid="map-container"]').click({ position: { x: 300, y: 300 } });
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
