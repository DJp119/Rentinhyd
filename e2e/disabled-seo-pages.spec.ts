// e2e/disabled-seo-pages.spec.ts
// End-to-end tests verifying disabled SEO routes redirect to /rent-map

import { test, expect } from '@playwright/test';

test.describe('Disabled SEO Landing Pages Redirect Flow', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  test('flats SEO page redirects to the map', async ({ page }) => {
    await page.goto(`${baseURL}/flats-for-rent-in-hyderabad`);

    // Verify redirected URL is /rent-map
    await expect(page).toHaveURL(/\/rent-map$/);

    // Verify rent-map page content is visible
    await expect(page.locator('h1')).toContainText('Hyderabad Rent Map');
  });

  test('flatmates SEO page redirects to the map', async ({ page }) => {
    await page.goto(`${baseURL}/flatmates-in-hyderabad`);

    // Verify redirected URL is /rent-map
    await expect(page).toHaveURL(/\/rent-map$/);

    // Verify rent-map page content is visible
    await expect(page.locator('h1')).toContainText('Hyderabad Rent Map');
  });
});
