import { Page } from '@playwright/test';

// Test credentials from environment variables (never hardcode)
export const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test+e2e@cherishly.app';
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

export async function signUp(page: Page, email: string = TEST_EMAIL, password: string = TEST_PASSWORD) {
  await page.goto('/auth');
  
  // Switch to signup mode if on login
  const signupButton = page.getByText('Need an account? Sign up');
  if (await signupButton.isVisible()) {
    await signupButton.click();
  }

  await page.getByTestId('auth-email-input').fill(email);
  await page.getByTestId('auth-password-input').fill(password);
  await page.getByTestId('auth-submit-button').click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

export async function login(page: Page, email: string = TEST_EMAIL, password: string = TEST_PASSWORD) {
  await page.goto('/auth');
  
  // Switch to login mode if on signup
  const loginButton = page.getByText('Already have an account? Sign in');
  if (await loginButton.isVisible()) {
    await loginButton.click();
  }

  await page.getByTestId('auth-email-input').fill(email);
  await page.getByTestId('auth-password-input').fill(password);
  await page.getByTestId('auth-submit-button').click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

export async function logout(page: Page) {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Logout' }).click();
  
  // Wait for redirect to auth
  await page.waitForURL('/auth', { timeout: 5000 });
}
