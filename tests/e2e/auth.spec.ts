import { test, expect } from '@playwright/test';
import { login, logout, TEST_EMAIL, TEST_PASSWORD } from '../utils/auth';

test.describe('Authentication', () => {
  test('should log in successfully', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('should log out successfully', async ({ page }) => {
    await login(page);
    await logout(page);
    await expect(page).toHaveURL('/auth');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    await page.getByTestId('auth-email-input').fill('wrong@email.com');
    await page.getByTestId('auth-password-input').fill('wrongpassword');
    await page.getByTestId('auth-submit-button').click();
    
    // Should stay on auth page
    await expect(page).toHaveURL('/auth');
  });
});
