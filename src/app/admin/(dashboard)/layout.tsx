import { redirect } from "next/navigation"
import { getLocalSuperadmin } from "@/lib/local-only"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminTopbar } from "@/components/admin/topbar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getLocalSuperadmin()
  if (!user) redirect("/admin/login")

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-foreground">
      <AdminTopbar user={user} />
      <div className="flex relative">
        <AdminSidebar />
        <main className="flex-1 min-w-0 p-3 pb-20 sm:p-4 md:p-6 lg:p-8 lg:pb-6 pt-16 lg:pt-24">
          {children}
        </main>
      </div>
    </div>
  )
}
