import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardTopbar } from "@/components/dashboard-topbar"
import { StatCards } from "@/components/stat-cards"
import { MessagesCard } from "@/components/messages-card"
import { AppointmentsCard } from "@/components/appointments-card"

function todayLabel() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default function Page() {
  const date = todayLabel()
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <DashboardTopbar />

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              Bonjour, Marie
            </h1>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {date}
            </p>
          </div>

          <StatCards />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MessagesCard />
            <AppointmentsCard />
          </div>
        </main>
      </div>
    </div>
  )
}
