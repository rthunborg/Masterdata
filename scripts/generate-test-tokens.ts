/**
 * Generate Test Authentication Tokens
 * 
 * This script uses Supabase Admin API to generate authentication tokens
 * for test users without needing to authenticate via the auth endpoint.
 * 
 * Usage:
 *   npx tsx scripts/generate-test-tokens.ts
 * 
 * Output:
 *   Prints environment variables to add to .env.test
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface TestUser {
  email: string;
  role: string;
  envVarName: string;
}

const testUsers: TestUser[] = [
  { email: 'admin@test.com', role: 'hr_admin', envVarName: 'TEST_HR_ADMIN_TOKEN' },
  { email: 'sodexo@test.com', role: 'sodexo', envVarName: 'TEST_SODEXO_TOKEN' },
  { email: 'omc@test.com', role: 'omc', envVarName: 'TEST_OMC_TOKEN' },
  { email: 'payroll@test.com', role: 'payroll', envVarName: 'TEST_PAYROLL_TOKEN' },
  { email: 'toplux@test.com', role: 'toplux', envVarName: 'TEST_TOPLUX_TOKEN' },
];

async function generateTokens() {
  console.log('🔑 Generating Test Authentication Tokens\n');
  console.log('='.repeat(80));
  console.log('');

  const tokens: Array<{ email: string; envVar: string; token: string; userId: string }> = [];

  for (const user of testUsers) {
    try {
      // Get user from database
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select('auth_user_id, email, role')
        .eq('email', user.email)
        .single();

      if (queryError || !users) {
        console.error(`✗ ${user.email}: User not found in database`);
        console.error(`  Make sure test users migration has been applied`);
        continue;
      }

      const authUserId = users.auth_user_id;

      // Sign in the user to get a real token
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: 'Test123!', // Standard test password
      });

      if (signInError || !authData.session) {
        console.error(`✗ ${user.email}: Failed to sign in`);
        console.error(`  Error: ${signInError?.message}`);
        continue;
      }

      const token = authData.session.access_token;

      tokens.push({
        email: user.email,
        envVar: user.envVarName,
        token: token,
        userId: authUserId,
      });

      console.log(`✓ ${user.email} (${user.role})`);
      console.log(`  User ID: ${authUserId}`);
      console.log(`  Token: ${token.substring(0, 20)}...`);
      console.log('');

      // Sign out to clean up session
      await supabase.auth.signOut();

    } catch (error) {
      console.error(`✗ ${user.email}: Unexpected error`);
      console.error(`  ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (tokens.length === 0) {
    console.error('\n❌ No tokens were generated');
    console.error('Please ensure:');
    console.error('  1. Test users have been created (run: npx tsx scripts/apply-hr-admin-migration.ts)');
    console.error('  2. Supabase credentials in .env.local are correct');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('\n📝 Add these to your .env.test file:\n');
  console.log('# Auto-generated test tokens');
  console.log(`# Generated: ${new Date().toISOString()}\n`);

  for (const { envVar, token } of tokens) {
    console.log(`${envVar}=${token}`);
  }

  console.log('\n# User IDs for reference');
  for (const { email, userId } of tokens) {
    const varName = email.split('@')[0].toUpperCase().replace(/\./g, '_') + '_USER_ID';
    console.log(`TEST_${varName}=${userId}`);
  }

  console.log('\n='.repeat(80));
  console.log('\n✅ Tokens generated successfully!');
  console.log('\nNOTE: These tokens expire after 1 hour. Re-run this script if tests fail with auth errors.');
  console.log('');
}

generateTokens().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
