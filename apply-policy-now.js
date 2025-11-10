import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
CREATE POLICY "Users can update own last_active_at" ON public.users
  FOR UPDATE 
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
`;

async function applyPolicy() {
  console.log('Applying RLS policy...');

  const { error } = await supabase.from('users').select('id').limit(1);

  if (error) {
    console.error('Connection error:', error);
    process.exit(1);
  }

  console.log('✓ Connected to Supabase');
  console.log('\n⚠️  Manual Action Required:');
  console.log('Please run this SQL in your Supabase SQL Editor:');
  console.log(
    'https://supabase.com/dashboard/project/' +
      supabaseUrl.match(/https:\/\/([^.]+)/)[1] +
      '/sql'
  );
  console.log('\n---SQL---');
  console.log(sql);
  console.log('---END SQL---\n');
  console.log(
    'After running the SQL, try logging in again and the last_active_at field should update!'
  );
}

applyPolicy()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
