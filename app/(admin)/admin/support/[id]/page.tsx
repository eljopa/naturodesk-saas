import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketActions } from "@/components/admin/ticket-actions";
import {
  updateTicketAction,
  replyToTicketAction,
} from "@/lib/actions/admin/support";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ticket = await db.supportTicket.findUnique({ where: { id } });
  if (!ticket) return {};
  return { title: `Ticket — ${ticket.title}` };
}

const STATUS_VARIANT: Record<string, "error" | "warning" | "success" | "neutral" | "info"> = {
  OPEN: "error",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CLOSED: "neutral",
};

const PRIORITY_VARIANT: Record<string, "error" | "warning" | "neutral" | "default"> = {
  URGENT: "error",
  HIGH: "warning",
  NORMAL: "default",
  LOW: "neutral",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminTicketDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          cabinetName: true,
        },
      },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          // We need to get the author name — join via a separate query
        },
      },
    },
  });

  if (!ticket) notFound();

  // Get reply authors separately (can't easily join in Prisma without relations)
  const replyAuthorIds = [...new Set(ticket.replies.map((r) => r.authorId))];
  const replyAuthors = await db.user.findMany({
    where: { id: { in: replyAuthorIds } },
    select: { id: true, name: true },
  });
  const authorMap = new Map(replyAuthors.map((a) => [a.id, a.name]));

  const updateAction = updateTicketAction.bind(null, ticket.id);
  const replyAction = replyToTicketAction.bind(null, ticket.id);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Support
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-semibold text-slate-900">{ticket.title}</h1>
              <Badge variant={STATUS_VARIANT[ticket.status] ?? "neutral"}>
                {ticket.status}
              </Badge>
              <Badge variant={PRIORITY_VARIANT[ticket.priority] ?? "default"}>
                {ticket.priority}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Par{" "}
              <Link
                href={`/admin/users/${ticket.user.id}`}
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                {ticket.user.name}
              </Link>
              {ticket.user.cabinetName && ` · ${ticket.user.cabinetName}`}
              {" · "}
              {ticket.createdAt.toLocaleString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thread */}
        <div className="lg:col-span-2 space-y-4">
          {/* Original message */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-slate-700">
                  {ticket.user.name}
                </span>
                <span className="text-xs text-slate-400">
                  {ticket.createdAt.toLocaleString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{ticket.body}</p>
            </CardContent>
          </Card>

          {/* Replies */}
          {ticket.replies.map((reply) => (
            <Card
              key={reply.id}
              className={reply.isAdmin ? "border-teal-200 bg-teal-50" : ""}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {authorMap.get(reply.authorId) ?? "Utilisateur"}
                  </span>
                  {reply.isAdmin && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-700">
                      Admin
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {reply.createdAt.toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{reply.body}</p>
              </CardContent>
            </Card>
          ))}

          {/* Reply form + status update */}
          <TicketActions
            currentStatus={ticket.status}
            currentPriority={ticket.priority}
            updateAction={updateAction}
            replyAction={replyAction}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Utilisateur</p>
                <Link
                  href={`/admin/users/${ticket.user.id}`}
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  {ticket.user.name}
                </Link>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Email</p>
                <p className="text-slate-800">{ticket.user.email}</p>
              </div>
              {ticket.user.cabinetName && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Cabinet</p>
                  <p className="text-slate-800">{ticket.user.cabinetName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Créé le</p>
                <p className="text-slate-800">
                  {ticket.createdAt.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              {ticket.resolvedAt && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Résolu le</p>
                  <p className="text-slate-800">
                    {ticket.resolvedAt.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Réponses</p>
                <p className="text-slate-800">{ticket.replies.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
