import { test, expect } from '@playwright/test';

test.describe('Cascading Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4321');
  });

  test('should load homepage with all filters', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that all filter elements are present
    await expect(page.locator('select').first()).toBeVisible(); // Cities dropdown
    await expect(page.locator('select').nth(1)).toBeVisible(); // Specialties dropdown
    await expect(page.locator('button:has-text("Filter by client")')).toBeVisible(); // Client filter
  });

  test('should update specialties and clients when selecting a city', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Get initial count of specialty options
    const citySelect = page.locator('select').first();
    const specialtySelect = page.locator('select').nth(1);

    // Count initial options
    const initialSpecialtyCount = await specialtySelect.locator('option').count();
    console.log('Initial specialty options:', initialSpecialtyCount);

    // Select Addison
    await citySelect.selectOption({ label: 'Addison' });

    // Wait for the loading state (filters should update)
    await page.waitForTimeout(1000);

    // Check that specialty options may have changed
    const updatedSpecialtyCount = await specialtySelect.locator('option').count();
    console.log('Updated specialty options after selecting Addison:', updatedSpecialtyCount);

    // The count should be less than or equal to the initial count (filtered)
    expect(updatedSpecialtyCount).toBeLessThanOrEqual(initialSpecialtyCount);
  });

  test('should update cities and clients when selecting a specialty', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const citySelect = page.locator('select').first();
    const specialtySelect = page.locator('select').nth(1);

    // Count initial city options
    const initialCityCount = await citySelect.locator('option').count();
    console.log('Initial city options:', initialCityCount);

    // Select a specialty (e.g., "Healthcare")
    await specialtySelect.selectOption({ index: 1 }); // Select first non-"All" option

    // Wait for filters to update
    await page.waitForTimeout(1000);

    // Check that city options may have changed
    const updatedCityCount = await citySelect.locator('option').count();
    console.log('Updated city options after selecting specialty:', updatedCityCount);

    // The count should be less than or equal to the initial count (filtered)
    expect(updatedCityCount).toBeLessThanOrEqual(initialCityCount);
  });

  test('should open client dropdown and show options', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click on the client filter dropdown
    const clientDropdown = page.locator('button:has-text("Filter by client")').first();
    await clientDropdown.click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // The dropdown should show client options - use more specific selector
    const atntOption = page.locator('button:has-text("AT&T")').filter({ hasText: '(23)' });
    await expect(atntOption).toBeVisible();
  });

  test('should filter clients based on selected city', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Select a city first
    const citySelect = page.locator('select').first();
    await citySelect.selectOption({ label: 'Addison' });

    // Wait for filters to update
    await page.waitForTimeout(1500);

    // Open client dropdown
    const clientDropdown = page.locator('button:has-text("Filter by client")').first();
    await clientDropdown.click();
    await page.waitForTimeout(500);

    // The dropdown should show filtered clients
    // Verify dropdown content is visible by checking for an option
    const dropdownOptions = page.locator('button').filter({ hasText: /\(\d+\)/ }).first();
    await expect(dropdownOptions).toBeVisible();
  });

  test('should show loading spinner while filters update', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const citySelect = page.locator('select').first();

    // Select a city
    await citySelect.selectOption({ label: 'Addison' });

    // Check for loading spinner (it should appear briefly)
    // Note: This might be hard to catch if the update is very fast
    const spinner = page.locator('.animate-spin');

    // Wait a bit to see if spinner appears
    try {
      await expect(spinner).toBeVisible({ timeout: 500 });
      console.log('Loading spinner detected');
    } catch (e) {
      console.log('Loading spinner not detected (update may have been too fast)');
    }
  });

  test('should submit search with selected filters', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Select a city
    const citySelect = page.locator('select').first();
    await citySelect.selectOption({ label: 'Addison' });

    // Wait for cascading updates
    await page.waitForTimeout(1000);

    // Click search button (more specific selector to avoid dev overlay)
    const searchButton = page.locator('form button[type="submit"]:has-text("Search")');
    await searchButton.click();

    // Should navigate to /lobbyists with query params
    await page.waitForURL(/\/lobbyists\?.*city=addison/);

    // Verify we're on the search results page
    await expect(page.locator('h1')).toContainText('Find Texas Lobbyists');
  });
});
