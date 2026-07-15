import Link from "next/link"
import { Video, Globe } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type AppointmentItem = {
  id: string
  startAt: Date
  type: "BILAN" | "SUIVI"
  source: string | null
  patient: { firstName: string; lastName: string }
}

type Labels = {
  title: string
  description: string
  seeAll: string
  typeBilan: string
  typeSuivi: string
  online: string
  emptyTitle: string
  emptyDescription: string
  newAppointment: string
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

export function AppointmentsCard({
  appointments,
  locale,
  labels,
}: {
  appointments: AppointmentItem[]
  locale: string
  labels: Labels
}) {
  return (
    <Card>
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{labels.title}</h2>
          <p className="text-sm text-nd-muted mt-0.5">{labels.description}</p>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/appointments">{labels.seeAll}</Link>
        </Button>
      </div>

      <CardContent className="pt-0 px-2 pb-2">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-medium text-slate-900">{labels.emptyTitle}</p>
            <p className="text-xs text-slate-500 mt-1">{labels.emptyDescription}</p>
            <Button variant="primary" size="sm" className="mt-4" asChild>
              <Link href="/appointments">{labels.newAppointment}</Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col">
            {appointments.map((appt) => (
              <li key={appt.id}>
                <Link
                  href={`/appointments/${appt.id}/edit`}
                  className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-nd-sage-wash"
                >
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="text-xs">
                      {initials(appt.patient.firstName, appt.patient.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {appt.patient.firstName} {appt.patient.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {appt.startAt.toLocaleString(locale, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {appt.source === "online_booking" && (
                      <Badge variant="neutral" className="gap-1 !bg-violet-50 !text-violet-700 !border-violet-200">
                        <Video className="size-3" aria-hidden="true" />
                        {labels.online}
                      </Badge>
                    )}
                    <Badge variant={appt.type === "BILAN" ? "default" : "info"}>
                      {appt.type === "BILAN" ? labels.typeBilan : labels.typeSuivi}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
