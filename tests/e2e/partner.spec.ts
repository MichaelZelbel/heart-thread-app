import { test, expect } from '@playwright/test';
import { login } from '../utils/auth';

test.describe('Partner Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display existing partner on dashboard', async ({ page }) => {
    await expect(page.getByText('Sona')).toBeVisible();
  });

  test('should create a new partner', async ({ page }) => {
    await page.getByTestId('add-partner-button').click();
    await expect(page).toHaveURL(/\/partner\/new/);

    // Fill in partner name
    await page.getByTestId('what-do-you-call-them').fill('Test Partner');
    
    // Navigate through wizard
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Save
    await page.getByTestId('partner-wizard-save-button').click();
    
    // Verify redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Verify partner appears
    await expect(page.getByText('Test Partner')).toBeVisible();
  });

  test('should navigate to partner detail page', async ({ page }) => {
    await page.getByText('Sona').click();
    await expect(page).toHaveURL(/\/partner\//);
    await expect(page.getByRole('heading', { name: 'Sona' })).toBeVisible();
  });
});
