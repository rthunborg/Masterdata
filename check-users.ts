import { Client } from 'pg';
const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
async function check() {
  await client.connect();
  const authResult = await client.query('SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5');
  console.log('Recent users:', authResult.rows);
  await client.end();
}
check().catch(console.error);
