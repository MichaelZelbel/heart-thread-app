import { test, expect } from '@playwright/test';
import { login } from '../utils/auth';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should match dashboard snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Hide dynamic content that changes
    await page.evaluate(() => {
      // Hide dates that change
      document.querySelectorAll('[class*="text-muted-foreground"]').forEach(el => {
        if (el.textContent?.match(/\d{4}/)) {
          (el as HTMLElement).style.visibility = 'hidden';
        }
      });
    });
    
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match partner detail snapshot', async ({ page }) => {
    await page.getByText('Sona').click();
    await page.waitForURL(/\/partner\//);
    await page.waitForLoadState('networkidle');
    
    // Hide dynamic dates
    await page.evaluate(() => {
      document.querySelectorAll('[class*="text-muted-foreground"]').forEach(el => {
        if (el.textContent?.match(/\d{4}/)) {
          (el as HTMLElement).style.visibility = 'hidden';
        }
      });
    });
    
    await expect(page).toHaveScreenshot('partner-detail.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match partner calendar snapshot', async ({ page }) => {
    await page.getByText('Sona').click();
    await page.waitForURL(/\/partner\//);
    await page.waitForLoadState('networkidle');
    
    // Scroll to calendar section
    await page.getByTestId('partner-calendar-container').scrollIntoViewIfNeeded();
    
    // Hide dynamic dates
    await page.evaluate(() => {
      document.querySelectorAll('[class*="text-muted-foreground"]').forEach(el => {
        if (el.textContent?.match(/\d{4}/)) {
          (el as HTMLElement).style.visibility = 'hidden';
        }
      });
    });
    
    await expect(page.getByTestId('partner-calendar-container')).toHaveScreenshot('partner-calendar.png', {
      maxDiffPixels: 100,
    });
  });
});
