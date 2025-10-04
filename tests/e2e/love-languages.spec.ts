import { test, expect } from '@playwright/test';
import { login } from '../utils/auth';

test.describe('Love Languages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to Sona's detail page
    await page.getByText('Sona').click();
    await page.waitForURL(/\/partner\//);
  });

  test('should set heart ratings and verify persistence', async ({ page }) => {
    // Set Physical Touch to 4 hearts
    const touchRow = page.getByTestId('love-language-row-touch');
    await touchRow.getByTestId('love-language-heart-button-4').click();

    // Set Receiving Gifts to 1 heart
    const giftsRow = page.getByTestId('love-language-row-gifts');
    await giftsRow.getByTestId('love-language-heart-button-1').click();

    // Set Words of Affirmation to "Not at all"
    const wordsRow = page.getByTestId('love-language-row-words');
    await wordsRow.getByTestId('love-language-not-at-all-chip').click();

    // Save changes
    await page.getByTestId('partner-detail-save-button').click();
    await expect(page.getByText('Saved')).toBeVisible();

    // Reload page
    await page.reload();

    // Verify Physical Touch = 4 (check if 4th heart is filled)
    const touchHearts = touchRow.locator('[class*="fill-primary"]');
    await expect(touchHearts).toHaveCount(4);

    // Verify Receiving Gifts = 1
    const giftsHearts = giftsRow.locator('[class*="fill-primary"]');
    await expect(giftsHearts).toHaveCount(1);

    // Verify Words of Affirmation = Not at all (0 filled hearts)
    const wordsHearts = wordsRow.locator('[class*="fill-primary"]');
    await expect(wordsHearts).toHaveCount(0);
  });
});
