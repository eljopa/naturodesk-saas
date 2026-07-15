import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type MessageItem = {
  id: string
  senderName: string
  senderEmail: string
  message: string
  createdAt: Date
}

type Labels = {
  title: string
  description: string
  seeAll: string
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function MessagesCard({
  messages,
  locale,
  labels,
}: {
  messages: MessageItem[]
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
          <Link href="/webpage/messages">{labels.seeAll}</Link>
        </Button>
      </div>
      <CardContent className="pt-0 px-2 pb-2">
        <ul className="flex flex-col">
          {messages.map((msg) => (
            <li key={msg.id}>
              <Link
                href={`/webpage/messages/${msg.id}`}
                className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-nd-sage-wash"
              >
                <Avatar className="size-9 shrink-0 mt-0.5">
                  <AvatarFallback className="text-xs">
                    {initials(msg.senderName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {msg.senderName}
                    </p>
                    <span className="shrink-0 text-xs text-slate-400">
                      {msg.createdAt.toLocaleDateString(locale, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-400">{msg.senderEmail}</p>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                    {msg.message}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
