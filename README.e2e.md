# E2E Testing Guide

This project uses Playwright for end-to-end testing with comprehensive coverage of authentication, partner management, likes/dislikes, love languages, and calendar features.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   npx playwright install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Add your `SUPABASE_SERVICE_ROLE_KEY` from Supabase dashboard
   - **IMPORTANT:** Never commit the service role key to git!

## Running Tests

### Run all tests (headless):
```bash
npm run test:e2e
```

This command:
1. Seeds the database with test data
2. Runs all Playwright tests in headless mode

### Run tests with UI:
```bash
npm run test:e2e:ui
```

### Update visual snapshots:
```bash
npm run test:update-snapshots
```

### Seed database only:
```bash
npm run seed:e2e
```

## Test Structure

- **`tests/e2e/auth.spec.ts`** - Authentication (signup, login, logout)
- **`tests/e2e/partner.spec.ts`** - Partner creation and management
- **`tests/e2e/likes.spec.ts`** - Likes CRUD and reordering
- **`tests/e2e/love-languages.spec.ts`** - Love language heart ratings
- **`tests/e2e/calendar.spec.ts`** - Calendar events and birthdates
- **`tests/e2e/visual.spec.ts`** - Visual regression testing
- **`tests/utils/auth.ts`** - Authentication helpers

## Test Data

The seed script creates:
- **Test User:** test+e2e@cherishly.app / Test1234!
- **Partner:** Sona
- **Event:** Anniversary (yearly recurring, June 15, 2020)

The seed script can be safely re-run - it deletes existing test data before creating new data.

## Selectors

All tests use `data-testid` attributes for stable, maintainable selectors:
- `auth-email-input`, `auth-password-input`, `auth-submit-button`
- `add-partner-button`, `what-do-you-call-them`
- `likes-input`, `likes-add-button`, `likes-list-container`
- `love-language-row-touch`, `love-language-heart-button-4`
- `calendar-add-event-button`, `event-title-input`
- And many more...

## Visual Regression

Visual snapshots are taken of:
- Dashboard
- Partner detail page
- Partner calendar section

Snapshots are stored in `tests/e2e/*.png` and committed to git as baselines.

## CI/CD

To run tests in CI:
1. Set `SUPABASE_SERVICE_ROLE_KEY` as a secret
2. Run `npm run test:e2e`
3. Tests run in headless mode with automatic retries

## Troubleshooting

**Tests fail with "User already exists":**
- The seed script handles this automatically
- If issues persist, manually delete the test user from Supabase

**Visual snapshots differ:**
- Update snapshots with `npm run test:update-snapshots`
- Review changes carefully before committing

**Timeout errors:**
- Increase timeout in `playwright.config.ts`
- Check if dev server is running properly

**Service role key errors:**
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
- Get the key from Supabase Dashboard → Settings → API
