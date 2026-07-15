import { CalendarClock, Video } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { appointments } from "@/lib/dashboard-data"

export function AppointmentsCard() {
  return (
    <Card className="gap-0 pb-2">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" aria-hidden="true" />
          <CardTitle className="text-base">Prochains rendez-vous</CardTitle>
        </div>
        <a
          href="#"
          className="text-xs font-medium text-primary hover:underline"
        >
          Tout voir
        </a>
      </CardHeader>
      <CardContent className="px-2">
        <ul className="flex flex-col">
          {appointments.map((a) => (
            <li key={a.id}>
              <a
                href="#"
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                    {a.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {a.patient}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.datetime}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.online ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-primary/30 text-primary"
                    >
                      <Video className="size-3" aria-hidden="true" />
                      En ligne
                    </Badge>
                  ) : null}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-medium",
                      a.type === "Bilan"
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {a.type}
                  </Badge>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
