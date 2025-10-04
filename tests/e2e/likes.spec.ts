import { test, expect } from '@playwright/test';
import { login } from '../utils/auth';

test.describe('Likes Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to Sona's detail page
    await page.getByText('Sona').click();
    await page.waitForURL(/\/partner\//);
  });

  test('should add, edit, delete, and reorder likes', async ({ page }) => {
    // Add a like
    await page.getByTestId('likes-input').fill('Chocolate Cake');
    await page.getByTestId('likes-add-button').click();
    await expect(page.getByText('Chocolate Cake')).toBeVisible();

    // Add another like
    await page.getByTestId('likes-input').fill('Coffee');
    await page.getByTestId('likes-add-button').click();
    await expect(page.getByText('Coffee')).toBeVisible();

    // Edit the first like
    const firstItem = page.getByTestId('item-row').first();
    await firstItem.getByTestId('item-edit-button').click();
    await firstItem.getByRole('textbox').fill('Vanilla Cake');
    await firstItem.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Vanilla Cake')).toBeVisible();
    await expect(page.getByText('Chocolate Cake')).not.toBeVisible();

    // Save changes
    await page.getByTestId('partner-detail-save-button').click();
    await expect(page.getByText('Saved')).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByText('Vanilla Cake')).toBeVisible();
    await expect(page.getByText('Coffee')).toBeVisible();

    // Delete a like
    const coffeeItem = page.getByTestId('item-row').filter({ hasText: 'Coffee' });
    await coffeeItem.getByTestId('item-delete-button').click();
    await expect(page.getByText('Coffee')).not.toBeVisible();

    // Save and verify deletion persists
    await page.getByTestId('partner-detail-save-button').click();
    await page.reload();
    await expect(page.getByText('Coffee')).not.toBeVisible();
    await expect(page.getByText('Vanilla Cake')).toBeVisible();
  });
});
