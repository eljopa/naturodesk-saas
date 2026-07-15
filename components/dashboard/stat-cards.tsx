import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export type StatItem = {
  label: string
  value: number
  icon: LucideIcon
  href: string
  hint: string
}

export function StatCards({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Link key={stat.label} href={stat.href} className="block group">
            <Card className="hover:border-slate-300 hover:shadow-md transition-all duration-150">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-nd-muted">{stat.label}</p>
                    <p className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
                      {stat.value}
                    </p>
                  </div>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-nd-sage-tint text-nd-sage">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-xs text-nd-muted">{stat.hint}</p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
