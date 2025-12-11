import { getUserFromSession } from '@/lib/server/auth';
import { redirect } from '@/lib/navigation';

export default async function Home() {
  const user = await getUserFromSession();
  
  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
