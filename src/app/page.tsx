import { getUserFromSession } from '@/lib/server/auth';
import { redirect } from '@/lib/navigation';

// Force dynamic rendering - this page checks auth status with cookies
export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getUserFromSession();
  
  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
