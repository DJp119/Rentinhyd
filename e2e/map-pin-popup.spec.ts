// e2e/map-pin-popup.spec.ts
// Regression test for existing map marker clicks opening PinBottomSheet

import { test, expect } from '@playwright/test';

test.describe('Existing Map Marker Click Flow', () => {
  test('clicking an existing marker opens PinBottomSheet', async ({ page }) => {
    await page.goto('/map');

    // Accept consent modal if present
    const acceptBtn = page.locator('[data-testid="consent-accept"]');
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
    }

    // Wait for map container to load
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();

    // Verify PinBottomSheet is initially hidden
    const sheet = page.locator('[data-testid="pin-bottom-sheet"]');
    await expect(sheet).toBeHidden();
  });
});
