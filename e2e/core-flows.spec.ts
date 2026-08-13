import { test, expect } from '@playwright/test';

// ============================================
// E2E Tests for Hyderabad Rent MVP Core User Flows
// ============================================
// Run: npx playwright test e2e/core-flows.spec.ts
// Requires:_dev server running (npm run dev) and .env.local configured

test.describe.configure({ retries: 2 });

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Core User Flows', () => {

  test.beforeEach(async ({ page }) => {
    // Clear cookies/storage between tests
    await page.context().clearCookies();
  });

  // Helper to ensure consent is handled without race conditions
  async function dismissConsent(page: any) {
    const consentModal = page.locator('[data-testid="consent-modal"]');
    const consentBtn = page.locator('[data-testid="consent-accept"]');
    try {
      await consentModal.waitFor({ state: 'visible', timeout: 2000 });
      await consentBtn.click();
      await consentModal.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // consent already dismissed
    }
  }

  // -------------------------------------------
  // 1. Anonymous Contributor - Rent Pin
  // -------------------------------------------
  test.describe('Anonymous Contributor adds Rent Pin', () => {
    test('can submit a rent pin successfully with mocked 201', async ({ page }) => {
      await page.route('**/api/rent-pins', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            status: 'pending',
            message: 'Rent pin submitted for review. It will appear on the map once approved.',
          }),
        });
      });

      await page.goto(`${baseURL}/map`);
      await page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 });
      await dismissConsent(page);

      // Open pin submission modal via map tap
      await page.locator('[data-testid="map-container"]').click({ position: { x: 300, y: 300 } });
      await page.locator('[data-testid="action-rent"]').click();

      // Fill pin form
      await page.fill('[data-testid="pin-locality"]', 'gachibowli');
      await page.fill('[data-testid="pin-rent-min"]', '20000');
      await page.fill('[data-testid="pin-rent-max"]', '30000');

      await page.waitForTimeout(500);

      // Submit
      await page.click('[data-testid="pin-submit"]');

      // Verify success message appears
      await expect(page.locator('[data-testid="pin-success"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="pin-success"]')).toContainText('successfully');
    });

    test('displays error and keeps modal open when API returns 500', async ({ page }) => {
      await page.route('**/api/rent-pins', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Unable to save your rent pin right now.',
          }),
        });
      });

      await page.goto(`${baseURL}/map`);
      await page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 });
      await dismissConsent(page);

      await page.locator('[data-testid="map-container"]').click({ position: { x: 300, y: 300 } });
      await page.locator('[data-testid="action-rent"]').click();

      await page.fill('[data-testid="pin-locality"]', 'gachibowli');
      await page.fill('[data-testid="pin-rent-min"]', '20000');
      await page.fill('[data-testid="pin-rent-max"]', '30000');

      await page.waitForTimeout(500);
      await page.click('[data-testid="pin-submit"]');

      // Form displays the server error
      const errorEl = page.locator('[data-testid="pin-error"]');
      await expect(errorEl).toBeVisible({ timeout: 5000 });
      await expect(errorEl).toContainText('Unable to save your rent pin right now.');

      // Success message does NOT appear
      await expect(page.locator('[data-testid="pin-success"]')).not.toBeVisible();

      // Form remains visible so user can retry
      await expect(page.locator('[data-testid="rent-pin-form"]')).toBeVisible();
    });

    test('rejects invalid rent pin (rentMin > rentMax)', async ({ page }) => {
      await page.goto(`${baseURL}/map`);
      await page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 });
      await dismissConsent(page);

      await page.locator('[data-testid="map-container"]').click({ position: { x: 300, y: 300 } });
      await page.locator('[data-testid="action-rent"]').click();

      await page.fill('[data-testid="pin-locality"]', 'gachibowli');
      await page.fill('[data-testid="pin-rent-min"]', '35000');
      await page.fill('[data-testid="pin-rent-max"]', '25000');

      await page.click('[data-testid="pin-submit"]');

      await expect(page.locator('[data-testid="pin-error"]')).toContainText('rentMin must be <= rentMax');
    });
  });

  // -------------------------------------------
  // 2. Owner - Verified Listing
  // -------------------------------------------
  test.describe('Owner creates Verified Listing', () => {
    test('can submit a new listing and receive verification email', async ({ page }) => {
      await page.goto(`${baseURL}/listings/new`);

      // Fill listing form
      await page.selectOption('[data-testid="listing-type"]', 'whole_flat');
      await page.fill('[data-testid="listing-title"]', 'Beautiful 2BHK in Gachibowli near metro');
      await page.fill('[data-testid="listing-description"]', 'Spacious apartment with great amenities, metro access, and 24/7 security. Available immediately.');
      await page.selectOption('[data-testid="listing-bhk"]', '2BHK');
      await page.selectOption('[data-testid="listing-furnishing"]', 'semi_furnished');
      await page.fill('[data-testid="listing-rent"]', '25000');
      await page.fill('[data-testid="listing-deposit"]', '2');
      await page.fill('[data-testid="listing-locality"]', 'gachibowli');
      await page.fill('[data-testid="listing-available-from"]', '2025-02-01');
      await page.fill('[data-testid="listing-available-until"]', '2025-08-01');

      // Amenities
      await page.check('[data-testid="amenity-wifi"]');
      await page.check('[data-testid="amenity-ac"]');
      await page.check('[data-testid="amenity-parking"]');

      // Contact preferences
      await page.fill('[data-testid="contact-email"]', 'owner@example.com');
      await page.fill('[data-testid="contact-phone"]', '+919876543210');
      await page.selectOption('[data-testid="contact-method"]', 'both');
      await page.fill('[data-testid="contact-window-start"]', '10:00');
      await page.fill('[data-testid="contact-window-end"]', '18:00');

      // Lifestyle prefs
      await page.selectOption('[data-testid="lifestyle-food"]', 'veg');
      await page.selectOption('[data-testid="lifestyle-smoking"]', 'no');
      await page.selectOption('[data-testid="lifestyle-drinking"]', 'no_preference');
      await page.selectOption('[data-testid="lifestyle-pets"]', 'no_preference');
      await page.selectOption('[data-testid="lifestyle-gender"]', 'no_preference');

      await page.click('[data-testid="listing-submit"]');

      // Verify verification sent message
      await expect(page.locator('[data-testid="listing-verification-sent"]')).toBeVisible({ timeout: 5000 });

      // Note: Actual email verification requires real Resend + inbox access
      // This test verifies the submission flow works
    });

    test('rejects listing with title too short', async ({ page }) => {
      await page.goto(`${baseURL}/listings/new`);
      await page.fill('[data-testid="listing-title"]', 'Short');
      await page.selectOption('[data-testid="listing-type"]', 'whole_flat');
      await page.selectOption('[data-testid="listing-bhk"]', '2BHK');
      await page.fill('[data-testid="listing-rent"]', '25000');
      await page.fill('[data-testid="listing-locality"]', 'gachibowli');

      await page.click('[data-testid="listing-submit"]');

      await expect(page.locator('[data-testid="listing-error"]')).toContainText('at least 10');
    });
  });

  // -------------------------------------------
  // 3. Seeker - Verified Seek Request
  // -------------------------------------------
  test.describe('Seeker creates Seek Request', () => {
    test('can submit a seek request and receive verification email', async ({ page }) => {
      await page.goto(`${baseURL}/seekers/new`);

      await page.fill('[data-testid="seeker-max-budget"]', '30000');
      await page.fill('[data-testid="seeker-min-budget"]', '15000');
      await page.selectOption('[data-testid="seeker-bhk"]', '2BHK');
      await page.selectOption('[data-testid="seeker-listing-type"]', 'whole_flat');
      await page.selectOption('[data-testid="seeker-furnishing"]', 'semi_furnished');
      await page.fill('[data-testid="seeker-move-in-earliest"]', '2025-02-01');
      await page.fill('[data-testid="seeker-move-in-latest"]', '2025-03-15');
      await page.fill('[data-testid="seeker-preferred-localities"]', 'gachibowli, madhapur, kondapur');
      await page.fill('[data-testid="seeker-excluded-localities"]', 'kukatpally');

      // Lifestyle prefs
      await page.selectOption('[data-testid="seeker-lifestyle-food"]', 'veg');
      await page.selectOption('[data-testid="seeker-lifestyle-smoking"]', 'no');

      await page.click('[data-testid="seeker-submit"]');

      await expect(page.locator('[data-testid="seeker-verification-sent"]')).toBeVisible({ timeout: 5000 });
    });

    test('rejects seeker with minBudget > maxBudget', async ({ page }) => {
      await page.goto(`${baseURL}/seekers/new`);
      await page.fill('[data-testid="seeker-max-budget"]', '25000');
      await page.fill('[data-testid="seeker-min-budget"]', '30000');
      await page.selectOption('[data-testid="seeker-bhk"]', '2BHK');

      await page.click('[data-testid="seeker-submit"]');

      await expect(page.locator('[data-testid="seeker-error"]')).toContainText('minBudget must be <= maxBudget');
    });
  });

  // -------------------------------------------
  // 4. Email Verification Flow
  // -------------------------------------------
  test.describe('Email Verification', () => {
    test('verifies listing via magic link token', async ({ page }) => {
      // This requires a real token from Resend
      // For E2E, we'd use a test token or mock the verification
      const testToken = 'a'.repeat(32);
      await page.goto(`${baseURL}/verify?token=${testToken}&type=listing`);

      // Should show pending verification or success
      await expect(page.locator('[data-testid="verify-result"]')).toBeVisible({ timeout: 10000 });
    });

    test('verifies seeker via magic link token', async ({ page }) => {
      const testToken = 'b'.repeat(32);
      await page.goto(`${baseURL}/verify?token=${testToken}&type=seeker`);

      await expect(page.locator('[data-testid="verify-result"]')).toBeVisible({ timeout: 10000 });
    });
  });

  // -------------------------------------------
  // 5. Matching & Double-Consent Contact Reveal
  // -------------------------------------------
  test.describe('Matching & Contact Introduction', () => {
    test('seeker receives match digest after verification', async ({ page }) => {
      // This flow requires: verified listing + verified seeker + matching job run
      // In E2E, we'd seed test data and trigger matching
      // Placeholder for integration test
      test.skip('Requires seeded test data and matching job');
    });

    test('double-consent: both parties must accept for introduction', async ({ page }) => {
      test.skip('Requires seeded match with action tokens');
    });

    test('introduction expires after 7 days if not both accepted', async ({ page }) => {
      test.skip('Requires time manipulation or seeded expired match');
    });
  });

  // -------------------------------------------
  // 6. Inbound "Rented" Email Command
  // -------------------------------------------
  test.describe('Inbound Email Commands', () => {
    test('owner replies "rented" -> listing marked rented, seekers notified', async ({ page }) => {
      test.skip('Requires Resend inbound webhook + seeded listing');
    });

    test('owner replies "still available" -> listing stays active', async ({ page }) => {
      test.skip('Requires Resend inbound webhook + seeded listing');
    });

    test('owner replies "withdraw" -> listing marked expired', async ({ page }) => {
      test.skip('Requires Resend inbound webhook + seeded listing');
    });

    test('unknown command -> ambiguous reply sent to owner', async ({ page }) => {
      test.skip('Requires Resend inbound webhook + seeded listing');
    });
  });

  // -------------------------------------------
  // 7. Rejection Flow
  // -------------------------------------------
  test.describe('Match Rejection', () => {
    test('seeker can decline a match', async ({ page }) => {
      test.skip('Requires seeded match with action token');
    });

    test('owner can decline a match', async ({ page }) => {
      test.skip('Requires seeded match with action token');
    });
  });

  // -------------------------------------------
  // 8. Admin Remediation
  // -------------------------------------------
  test.describe('Admin Moderation', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin (if admin auth exists)
      test.skip('Admin authentication not implemented yet');
    });

    test('admin can view pending reports', async ({ page }) => {
      await page.goto(`${baseURL}/admin`);
      await expect(page.locator('[data-testid="admin-reports"]')).toBeVisible();
    });

    test('admin can quarantine a listing', async ({ page }) => {
      test.skip('Requires seeded report and listing');
    });

    test('admin can approve a listing', async ({ page }) => {
      test.skip('Requires seeded report and listing');
    });

    test('admin can ban a user', async ({ page }) => {
      test.skip('Requires seeded user and evidence');
    });
  });
});

// -------------------------------------------
// Visual Regression Tests (optional)
// -------------------------------------------
test.describe('Visual Regression', () => {
  test('home page matches snapshot', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home-page.png', { fullPage: true });
  });

  test('map page matches snapshot', async ({ page }) => {
    await page.goto(`${baseURL}/map`);
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 });
    await expect(page).toHaveScreenshot('map-page.png', { fullPage: true });
  });

  test('listing detail page matches snapshot', async ({ page }) => {
    await page.goto(`${baseURL}/list/test-listing-id`);
    await expect(page).toHaveScreenshot('listing-detail.png', { fullPage: true });
  });
});