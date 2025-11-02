import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://njgmfvsqevhoxpqbnpnd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZ21mdnNxZXZob3hwcWJucG5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUwMjE3NCwiZXhwIjoyMDc3MDc4MTc0fQ.BQj4VnRYIi5CSmI18Hfha6B8iyz4jIcJvlqkH4FwHbI'
);
async function check() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, last_active_at')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) console.error('Error:', error);
  console.log('Users found:', data?.length || 0);
  console.log(JSON.stringify(data, null, 2));
}
check().catch(console.error);
