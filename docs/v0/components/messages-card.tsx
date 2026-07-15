import { Mail } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { messages } from "@/lib/dashboard-data"

export function MessagesCard() {
  return (
    <Card className="gap-0 pb-2">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-4">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-primary" aria-hidden="true" />
          <CardTitle className="text-base">Messages non lus</CardTitle>
        </div>
        <Badge className="rounded-full bg-primary text-primary-foreground">
          {messages.length}
        </Badge>
      </CardHeader>
      <CardContent className="px-2">
        <ul className="flex flex-col">
          {messages.map((m) => (
            <li key={m.id}>
              <a
                href="#"
                className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
              >
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                    {m.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {m.name}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {m.date}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/70">
                    {m.preview}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
