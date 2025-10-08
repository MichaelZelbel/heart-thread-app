import 'dotenv/config';
import { test, expect, request } from '@playwright/test';

// This E2E probe ensures the public (anon) key cannot read profiles at all
// It should return 401/403, not 200 with rows

test.describe('Security: profiles table', () => {
  test('anon REST access to profiles is denied', async () => {
    const baseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    expect(baseUrl, 'VITE_SUPABASE_URL must be set').toBeTruthy();
    expect(anonKey, 'VITE_SUPABASE_PUBLISHABLE_KEY must be set').toBeTruthy();

    const ctx = await request.newContext({ baseURL: baseUrl });
    const res = await ctx.get(`/rest/v1/profiles?select=id`, {
      headers: {
        apikey: anonKey as string,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    expect([401, 403]).toContain(res.status());
  });
});