import { redirect } from 'next/navigation';

// Root page - redirect to Swedish locale by default
export default function RootPage() {
  redirect('/sv');
}
