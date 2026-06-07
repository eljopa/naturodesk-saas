import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Mail, Phone, ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageActions } from "@/components/messages/message-actions";
import { NoteEditor } from "@/components/messages/note-editor";
import type { ContactMessageStatus } from "@prisma/client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("messages") };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadgeVariant(status: ContactMessageStatus) {
  const map: Record<ContactMessageStatus, "error" | "neutral" | "success" | "info"> = {
    UNREAD: "error",
    READ: "neutral",
    REPLIED: "success",
    ARCHIVED: "info",
  };
  return map[status];
}

function statusLabelKey(status: ContactMessageStatus): string {
  const map: Record<ContactMessageStatus, string> = {
    UNREAD: "statusUnread",
    READ: "statusRead",
    REPLIED: "statusReplied",
    ARCHIVED: "statusArchived",
  };
  return map[status];
}

// ---------------------------------------------------------------------------
// Page détail
// ---------------------------------------------------------------------------

interface MessageDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MessageDetailPage({ params }: MessageDetailPageProps) {
  const { id } = await params;
  const [user, t, locale] = await Promise.all([
    requireUser(),
    getTranslations("messages"),
    getLocale(),
  ]);

  const message = await db.contactMessage.findFirst({
    where: { id, userId: user.id },
  });

  if (!message) notFound();

  // Auto-mark as READ when opening an UNREAD message (fire-and-forget)
  if (message.status === "UNREAD") {
    void db.contactMessage
      .update({
        where: { id },
        data: { status: "READ", isRead: true, readAt: new Date() },
      })
      .catch(() => {});
  }

  // Statut affiché — montrer READ immédiatement si on vient d'ouvrir
  const displayStatus: ContactMessageStatus =
    message.status === "UNREAD" ? "READ" : message.status;

  // Sujet pré-rempli pour le mailto
  const replySubject = encodeURIComponent(
    `Re: Message depuis votre page ${user.cabinetName ?? user.name}`
  );
  const replyBody = encodeURIComponent(
    `Bonjour ${message.senderName},\n\n`
  );
  const mailtoHref = `mailto:${message.senderEmail}?subject=${replySubject}&body=${replyBody}`;

  // Formatage dates
  const fullDate = message.createdAt.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function formatTimestamp(date: Date | null): string {
    if (!date) return "";
    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-2xl">
      {/* Retour */}
      <Link
        href="/webpage/messages"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToList")}
      </Link>

      {/* En-tête message */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {message.senderName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{fullDate}</p>
        </div>
        <Badge variant={statusBadgeVariant(displayStatus)}>
          {t(statusLabelKey(displayStatus) as Parameters<typeof t>[0])}
        </Badge>
      </div>

      <div className="space-y-5">
        {/* Coordonnées */}
        <Card>
          <CardContent className="pt-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t("senderSection")}
            </h2>
            <div className="space-y-2">
              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">
                  {message.senderEmail}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Copier email */}
                  <CopyEmailButton email={message.senderEmail} label={t("copyEmail")} copied={t("copied")} />
                  {/* Répondre */}
                  <a
                    href={mailtoHref}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-nd-sage-tint text-nd-sage-deep border border-nd-sage-tint hover:bg-nd-sage-wash transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {t("replyByEmail")}
                  </a>
                </div>
              </div>

              {/* Téléphone */}
              {message.senderPhone ? (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <a
                    href={`tel:${message.senderPhone}`}
                    className="text-sm text-nd-sage-deep hover:underline"
                  >
                    {message.senderPhone}
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-300 shrink-0" />
                  <span className="text-sm text-slate-400">{t("noPhone")}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Corps du message */}
        <Card>
          <CardContent className="pt-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t("messageSection")}
            </h2>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {message.message}
            </p>
          </CardContent>
        </Card>

        {/* Note interne */}
        <Card>
          <CardContent className="pt-5">
            <NoteEditor messageId={message.id} initialNotes={message.notes} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div>
          <MessageActions messageId={message.id} status={displayStatus} />
        </div>

        {/* Timestamps */}
        {(message.readAt || message.repliedAt || message.archivedAt) && (
          <div className="space-y-1 pt-2 border-t border-slate-100">
            {message.readAt && (
              <p className="text-xs text-slate-400">
                {t("readAt", { date: formatTimestamp(message.readAt) })}
              </p>
            )}
            {message.repliedAt && (
              <p className="text-xs text-slate-400">
                {t("repliedAt", { date: formatTimestamp(message.repliedAt) })}
              </p>
            )}
            {message.archivedAt && (
              <p className="text-xs text-slate-400">
                {t("archivedAt", { date: formatTimestamp(message.archivedAt) })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant Copy email (client-side)
// ---------------------------------------------------------------------------

function CopyEmailButton({
  email,
  label,
  copied,
}: {
  email: string;
  label: string;
  copied: string;
}) {
  return (
    <CopyButtonClient email={email} label={label} copied={copied} />
  );
}

// Séparé pour garder la page Server Component — petit client component inline
import { CopyButtonClient } from "./copy-button-client";
