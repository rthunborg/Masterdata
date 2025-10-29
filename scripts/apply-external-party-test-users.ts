/**
 * Apply External Party Test Users Migration
 * Creates test users for Sodexo, OMC, Payroll, and Toplux
 * 
 * Usage:
 *   Development: npx tsx scripts/apply-external-party-test-users.ts
 *   Production:  npx tsx scripts/apply-external-party-test-users.ts --prod
 * 
 * For production, set these env vars in Vercel or local .env.production:
 *   NEXT_PUBLIC_SUPABASE_URL=<production-url>
 *   SUPABASE_SERVICE_ROLE_KEY=<production-service-key>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Check if running in production mode
const isProduction = process.argv.includes('--prod');
const envFile = isProduction ? '.env.production' : '.env.local';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), envFile) });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error(`   Environment file: ${envFile}`);
  process.exit(1);
}

console.log(`\n🔧 Environment: ${isProduction ? 'PRODUCTION' : 'Development'}`);
console.log(`📁 Config file: ${envFile}`);
console.log(`🔗 Supabase URL: ${supabaseUrl}\n`);

// Test user definitions
const testUsers = [
  { email: 'hradmin@test.com', password: 'Test123!', role: 'hr_admin', description: 'HR Admin' },
  { email: 'sodexo@test.com', password: 'Test123!', role: 'sodexo', description: 'Sodexo External Party' },
  { email: 'omc@test.com', password: 'Test123!', role: 'omc', description: 'ÖMC External Party' },
  { email: 'payroll@test.com', password: 'Test123!', role: 'payroll', description: 'Payroll External Party' },
  { email: 'toplux@test.com', password: 'Test123!', role: 'toplux', description: 'Toplux External Party' },
  { email: 'inactive@test.com', password: 'Test123!', role: 'sodexo', description: 'Inactive User (for testing)', isActive: false },
];

async function createTestUsers() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🚀 Creating test user accounts for smoke testing...\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  let successCount = 0;
  let existingCount = 0;
  let errorCount = 0;

  for (const user of testUsers) {
    const isActive = user.isActive !== undefined ? user.isActive : true;
    
    try {
      // Check if user already exists in public.users
      const { data: existing } = await supabase
        .from('users')
        .select('email, role, is_active, auth_user_id')
        .eq('email', user.email)
        .single();

      if (existing) {
        console.log(`📋 ${user.email}`);
        console.log(`   Description: ${user.description}`);
        console.log(`   Status: ✅ Already exists (role: ${existing.role}, active: ${existing.is_active})`);
        console.log('');
        existingCount++;
        continue;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          role: user.role
        }
      });

      if (authError) {
        // Handle case where auth user exists but public.users record doesn't
        if (authError.message.includes('already registered')) {
          console.log(`📋 ${user.email}`);
          console.log(`   Description: ${user.description}`);
          console.log(`   Auth Status: ⚠️  Auth user exists, creating public record...`);
          
          // Get the existing auth user ID
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const authUser = authUsers?.users.find(u => u.email === user.email);
          
          if (authUser) {
            // Create public.users record
            const { error: userError } = await supabase
              .from('users')
              .insert({
                auth_user_id: authUser.id,
                email: user.email,
                role: user.role,
                is_active: isActive
              });

            if (userError && !userError.message.includes('duplicate')) {
              console.error(`   Error: ❌ Failed to create user record - ${userError.message}`);
              console.log('');
              errorCount++;
            } else {
              console.log(`   Status: ✅ Public user record created`);
              console.log(`   Password: ${user.password}`);
              console.log('');
              successCount++;
            }
          } else {
            console.error(`   Error: ❌ Could not find auth user`);
            console.log('');
            errorCount++;
          }
        } else {
          console.log(`📋 ${user.email}`);
          console.log(`   Description: ${user.description}`);
          console.error(`   Error: ❌ ${authError.message}`);
          console.log('');
          errorCount++;
        }
        continue;
      }

      // Create public.users record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          email: user.email,
          role: user.role,
          is_active: isActive
        });

      if (userError) {
        console.log(`📋 ${user.email}`);
        console.log(`   Description: ${user.description}`);
        console.error(`   Error: ❌ Failed to create user record - ${userError.message}`);
        console.log('');
        errorCount++;
      } else {
        console.log(`📋 ${user.email}`);
        console.log(`   Description: ${user.description}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${isActive}`);
        console.log(`   Password: ${user.password}`);
        console.log(`   Status: ✅ Created successfully`);
        console.log('');
        successCount++;
      }

    } catch (error) {
      console.log(`📋 ${user.email}`);
      console.log(`   Description: ${user.description}`);
      console.error(`   Error: ❌ ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('');
      errorCount++;
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📊 Summary:');
  console.log(`   ✅ Created: ${successCount}`);
  console.log(`   📋 Already existed: ${existingCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📈 Total: ${testUsers.length}`);
  
  if (errorCount === 0) {
    console.log('\n✅ All test users ready for smoke testing!');
    console.log('\n📝 Test Credentials Summary:');
    console.log('═══════════════════════════════════════════════════════════');
    testUsers.forEach(user => {
      console.log(`   ${user.email} / ${user.password} (${user.role})`);
    });
    console.log('═══════════════════════════════════════════════════════════');
  } else {
    console.log('\n⚠️  Some users failed to create. Check errors above.');
    process.exit(1);
  }
}

// Confirm production execution
if (isProduction) {
  console.log('⚠️  WARNING: Running in PRODUCTION mode!');
  console.log('   This will create test users in your production database.');
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
  
  setTimeout(() => {
    createTestUsers();
  }, 5000);
} else {
  createTestUsers();
}
