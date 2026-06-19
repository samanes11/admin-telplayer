import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <main className="pb-28">{children}</main>
      <Sidebar />
    </div>
  );
}