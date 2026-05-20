import { redirect } from "@/lib/navigation";
import { getUserFromSession } from "@/lib/server/auth";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromSession();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "hr_admin") {
    redirect("/dashboard");
  }

  return children;
}
