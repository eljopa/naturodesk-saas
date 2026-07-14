import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketReplyForm } from "@/components/support/ticket-reply-form";
import { ReopenTicketButton } from "@/components/support/reopen-ticket-button";
import { replyToTicketAction, reopenTicketAction } from "@/lib/actions/support";
import type { SupportTicketStatus } from "@prisma/client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("support") };
}

function statusFilterKey(s: SupportTicketStatus): string {
  const map: Record<SupportTicketStatus, string> = {
    OPEN: "statusOpen",
    IN_PROGRESS: "statusInProgress",
    RESOLVED: "statusResolved",
    CLOSED: "statusClosed",
  };
  return map[s];
}

function statusBadgeVariant(status: SupportTicketStatus) {
  const map: Record<SupportTicketStatus, "error" | "info" | "success" | "neutral"> = {
    OPEN: "error",
    IN_PROGRESS: "info",
    RESOLVED: "success",
    CLOSED: "neutral",
  };
  return map[status];
}

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { id } = await params;
  const [user, t, locale] = await Promise.all([requireUser(), getTranslations("support"), getLocale()]);

  const ticket = await db.supportTicket.findFirst({
    where: { id, userId: user.id },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();

  const canReopen = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  const isClosed = ticket.status === "CLOSED";

  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const replyAction = replyToTicketAction.bind(null, ticket.id);
  const reopenAction = reopenTicketAction.bind(null, ticket.id);

  return (
    <div className="max-w-2xl">
      <Link
        href="/support"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToList")}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{ticket.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("createdOn", { date: formatDate(ticket.createdAt) })}</p>
        </div>
        <Badge variant={statusBadgeVariant(ticket.status)}>{t(statusFilterKey(ticket.status) as Parameters<typeof t>[0])}</Badge>
      </div>

      <div className="space-y-4">
        {/* Message initial */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-700">{t("you")}</span>
              <span className="text-xs text-slate-400">{formatDate(ticket.createdAt)}</span>
            </div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{ticket.body}</p>
          </CardContent>
        </Card>

        {/* Réponses */}
        {ticket.replies.map((reply) => (
          <Card key={reply.id} className={reply.isAdmin ? "border-nd-sage-tint bg-nd-sage-wash" : ""}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-700">
                  {reply.isAdmin ? t("supportTeam") : t("you")}
                </span>
                <span className="text-xs text-slate-400">{formatDate(reply.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{reply.body}</p>
            </CardContent>
          </Card>
        ))}

        {/* Actions */}
        {canReopen && <ReopenTicketButton reopenAction={reopenAction} />}

        {isClosed ? (
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600">{t("closedNotice")}</div>
        ) : (
          <TicketReplyForm replyAction={replyAction} />
        )}
      </div>
    </div>
  );
}
