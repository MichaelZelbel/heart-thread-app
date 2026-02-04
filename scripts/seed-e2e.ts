import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test credentials from environment variables (never hardcode)
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test+e2e@cherishly.app';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD!;

if (!TEST_PASSWORD) {
  console.error('E2E_TEST_PASSWORD environment variable is required');
  process.exit(1);
}

async function seed() {
  console.log('🌱 Starting E2E seed...');

  // Delete existing test user if exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find(u => u.email === TEST_EMAIL);
  
  if (existingUser) {
    console.log('🗑️  Deleting existing test user...');
    await supabase.auth.admin.deleteUser(existingUser.id);
  }

  // Create test user
  console.log('👤 Creating test user...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      display_name: 'E2E Test User'
    }
  });

  if (authError || !authData.user) {
    console.error('Failed to create user:', authError);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✅ User created: ${userId}`);

  // Create profile
  console.log('📝 Creating profile...');
  await supabase.from('profiles').insert({
    id: userId,
    display_name: 'E2E Test User'
  });

  // Create partner
  console.log('💕 Creating partner...');
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .insert({
      user_id: userId,
      name: 'Sona',
      love_language_physical: 3,
      love_language_words: 3,
      love_language_quality: 3,
      love_language_acts: 3,
      love_language_gifts: 3
    })
    .select()
    .single();

  if (partnerError || !partner) {
    console.error('Failed to create partner:', partnerError);
    process.exit(1);
  }

  console.log(`✅ Partner created: ${partner.id}`);

  // Create Anniversary event
  console.log('📅 Creating Anniversary event...');
  await supabase.from('events').insert({
    user_id: userId,
    partner_id: partner.id,
    title: 'Anniversary',
    event_date: '2020-06-15',
    event_type: 'Anniversary',
    is_recurring: true,
    description: 'Our special day'
  });

  console.log('✅ E2E seed completed successfully!');
  console.log(`\nTest credentials:\n  Email: ${TEST_EMAIL}\n  Password: ${TEST_PASSWORD}`);
}

seed().catch(console.error);
