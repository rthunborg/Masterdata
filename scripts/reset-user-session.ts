/**
 * Reset User Session Script
 * 
 * Helps reset authentication sessions for users experiencing login issues
 * Run with: pnpm exec tsx scripts/reset-user-session.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function resetUserSession() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  console.log('='.repeat(60));
  console.log('User Session Reset Tool');
  console.log('='.repeat(60));
  console.log();

  try {
    // Get user email
    const email = await question('Enter user email: ');
    
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      rl.close();
      return;
    }

    console.log();
    console.log('Searching for user...');

    // Find user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching users:', authError.message);
      rl.close();
      return;
    }

    const user = authUser.users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      rl.close();
      return;
    }

    console.log(`✓ Found user: ${user.email} (ID: ${user.id})`);
    console.log();

    // Ask for confirmation
    const confirm = await question('Reset this user\'s session? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled');
      rl.close();
      return;
    }

    console.log();
    console.log('Resetting session...');

    // Method 1: Sign out user (invalidates refresh tokens)
    const { error: signOutError } = await supabase.auth.admin.signOut(user.id);
    
    if (signOutError) {
      console.error('⚠️  Warning: Could not sign out user:', signOutError.message);
    } else {
      console.log('✓ User signed out successfully');
    }

    // Method 2: Update user metadata to trigger re-authentication
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          session_reset_at: new Date().toISOString()
        }
      }
    );

    if (updateError) {
      console.error('⚠️  Warning: Could not update user metadata:', updateError.message);
    } else {
      console.log('✓ User metadata updated');
    }

    console.log();
    console.log('='.repeat(60));
    console.log('✅ Session reset complete!');
    console.log('='.repeat(60));
    console.log();
    console.log('Next steps for the user:');
    console.log('1. Close all browser tabs/windows');
    console.log('2. Clear browser cookies (or use incognito mode)');
    console.log('3. Visit the login page and sign in again');
    console.log();

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    rl.close();
  }
}

// Run the script
resetUserSession().catch(console.error);
