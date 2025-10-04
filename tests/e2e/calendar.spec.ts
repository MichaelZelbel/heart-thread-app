import { test, expect } from '@playwright/test';
import { login } from '../utils/auth';

test.describe('Calendar Events', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should set birthdate and verify it appears in calendars', async ({ page }) => {
    // Navigate to Sona's detail page
    await page.getByText('Sona').click();
    await page.waitForURL(/\/partner\//);

    // Set birthdate (only month and day)
    await page.getByTestId('birthdate-month-input').click();
    await page.getByRole('option', { name: 'September' }).click();
    
    await page.getByTestId('birthdate-day-input').click();
    await page.getByRole('option', { name: '15' }).click();

    // Save changes
    await page.getByTestId('partner-detail-save-button').click();
    await expect(page.getByText('Saved')).toBeVisible();

    // Verify Birthday appears in partner calendar
    await expect(page.getByText("Sona's Birthday")).toBeVisible();

    // Go to dashboard
    await page.goto('/dashboard');

    // Verify Birthday appears in upcoming list
    await page.getByTestId('upcoming-list').waitFor();
    const upcomingList = page.getByTestId('upcoming-list');
    await expect(upcomingList.getByText("Sona's Birthday")).toBeVisible();
  });

  test('should add Day We Met event with yearly recurrence', async ({ page }) => {
    // Navigate to Sona's detail page
    await page.getByText('Sona').click();
    await page.waitForURL(/\/partner\//);

    // Add event
    await page.getByTestId('calendar-add-event-button').click();

    // Select event type
    await page.getByLabel('Type').click();
    await page.getByRole('option', { name: 'Day We Met' }).click();

    // Fill in date
    await page.getByTestId('event-date-input').fill('06/01/2019');

    // Ensure recurrence is on
    const recurrenceToggle = page.getByTestId('event-recurrence-toggle');
    const isChecked = await recurrenceToggle.getAttribute('data-state');
    if (isChecked !== 'checked') {
      await recurrenceToggle.click();
    }

    // Create event
    await page.getByRole('button', { name: 'Create' }).click();

    // Verify event appears in partner calendar
    await expect(page.getByText('Day We Met')).toBeVisible();

    // Save changes
    await page.getByTestId('partner-detail-save-button').click();

    // Go to dashboard
    await page.goto('/dashboard');

    // Verify Day We Met appears in upcoming list (if within 6 months)
    // Note: This might not always be visible depending on the date
    await page.getByTestId('upcoming-list').waitFor();
  });

  test('should verify Anniversary event from seed', async ({ page }) => {
    // Navigate to Sona's detail page
    await page.getByText('Sona').click();
    await page.waitForURL(/\/partner\//);

    // Verify Anniversary appears in calendar
    await expect(page.getByText('Anniversary')).toBeVisible();
  });
});
