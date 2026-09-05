// e2e/map-add-menu.spec.ts
// End-to-end tests for the Map Tap "Add Something Here" flow

import { test, expect } from '@playwright/test';

test.describe('Map Tap Add Something Here Flow', () => {
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

  test('consent modal blocks map actions before acceptance', async ({ page }) => {
    await page.goto('/map', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Modal should be visible
    const modal = page.locator('[data-testid="consent-modal"]');
    await expect(modal).toBeVisible();

    // Accept consent
    const acceptBtn = page.locator('[data-testid="consent-accept"]');
    await acceptBtn.click();
    await expect(modal).toBeHidden();
  });

  test('empty map click opens MapAddMenu with three actions', async ({ page }) => {
    await page.goto('/map', { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await waitForMapLoad(page);

    // Click map container
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();
    await page.locator('[data-testid="map-canvas"]').click({ position: { x: 300, y: 300 } });

    // MapAddMenu should open
    const addMenu = page.locator('[data-testid="map-add-menu"]');
    await expect(addMenu).toBeVisible();

    // Verify three active action buttons and absence of seek action
    await expect(page.locator('[data-testid="action-rent"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-tolet"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-seek"]')).toHaveCount(0);
  });

  test('map popup contains exactly three action buttons', async ({ page }) => {
    await page.goto('/map', { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await waitForMapLoad(page);

    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();
    await page.locator('[data-testid="map-canvas"]').click({ position: { x: 300, y: 300 } });

    const addMenu = page.locator('[data-testid="map-add-menu"]');
    await expect(addMenu).toBeVisible();

    const actionButtons = page.locator('[data-testid^="action-"]');
    await expect(actionButtons).toHaveCount(3);
    await expect(page.locator('[data-testid="action-seek"]')).toHaveCount(0);
  });

  test('Rent action opens RentPinForm', async ({ page }) => {
    await page.goto('/map', { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await waitForMapLoad(page);

    const mapContainer = page.locator('[data-testid="map-container"]');
    await page.locator('[data-testid="map-canvas"]').click({ position: { x: 300, y: 300 } });

    await page.locator('[data-testid="action-rent"]').click();

    // Rent form should be visible
    const rentForm = page.locator('[data-testid="rent-pin-form"]');
    await expect(rentForm).toBeVisible();
    await expect(page.locator('[data-testid="pin-locality"]')).toBeVisible();
    await expect(page.locator('[data-testid="pin-submit"]')).toBeVisible();
  });

  test('List action opens ListingForm', async ({ page }) => {
    await page.goto('/map', { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await waitForMapLoad(page);

    const mapContainer = page.locator('[data-testid="map-container"]');
    await page.locator('[data-testid="map-canvas"]').click({ position: { x: 300, y: 300 } });

    await page.locator('[data-testid="action-list"]').click();

    // Listing form should open
    await expect(page.locator('text=List Your Property')).toBeVisible();
  });

  /*
  test('Seek action preselects clicked locality', async ({ page }) => {
    await page.goto('/map');
    await dismissConsent(page);

    const mapContainer = page.locator('[data-testid="map-container"]');
    await page.locator('[data-testid="map-canvas"]').click({ position: { x: 300, y: 300 } });

    await page.locator('[data-testid="action-seek"]').click();

    // Seeker form should open
    await expect(page.locator('text=Find Your Place')).toBeVisible();
  });
  */

  test('To-Let action opens ToLetBoardForm', async ({ page }) => {
    await page.goto('/map', { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await waitForMapLoad(page);

    const mapContainer = page.locator('[data-testid="map-container"]');
    await page.locator('[data-testid="map-canvas"]').click({ position: { x: 300, y: 300 } });

    await page.locator('[data-testid="action-tolet"]').click();

    // To-Let form should open
    const toletForm = page.locator('[data-testid="tolet-board-form"]');
    await expect(toletForm).toBeVisible();
    await expect(page.locator('[data-testid="tolet-photo-input"]')).toBeAttached();
    await expect(page.locator('[data-testid="tolet-phone-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="tolet-submit-button"]')).toBeVisible();
  });

  test('closing the popup restores the map', async ({ page }) => {
    await page.goto('/map', { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await waitForMapLoad(page);

    const mapContainer = page.locator('[data-testid="map-container"]');
    await page.locator('[data-testid="map-canvas"]').click({ position: { x: 300, y: 300 } });

    const addMenu = page.locator('[data-testid="map-add-menu"]');
    await expect(addMenu).toBeVisible();

    // Click close
    await page.locator('[data-testid="add-menu-close"]').click();
    await expect(addMenu).toBeHidden();
  });
});
