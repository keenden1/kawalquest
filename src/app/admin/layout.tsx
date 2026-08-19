import Nav from "@/components/Nav";
import { redirect } from "next/navigation";
import { getSessionUser, isAdminRole } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/account");

  return (
    <div className="min-h-screen">
      <Nav role={user.role} email={user.email} />
      <main className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
