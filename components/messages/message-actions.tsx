"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCheck, Archive, RotateCcw, MailOpen, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContactMessageStatus } from "@prisma/client";
import {
  markReadAction,
  markUnreadAction,
  markRepliedAction,
  archiveMessageAction,
  restoreMessageAction,
} from "@/lib/actions/messages";

interface MessageActionsProps {
  messageId: string;
  status: ContactMessageStatus;
}

export function MessageActions({ messageId, status }: MessageActionsProps) {
  const t = useTranslations("messages");
  const [isPending, startTransition] = useTransition();

  function doAction(fn: (id: string) => Promise<void>) {
    startTransition(() => fn(messageId));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Marquer comme lu / non lu */}
      {status === "UNREAD" && (
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => doAction(markReadAction)}
        >
          <MailOpen className="w-4 h-4" />
          {t("markRead")}
        </Button>
      )}
      {status === "READ" && (
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => doAction(markUnreadAction)}
        >
          <Mail className="w-4 h-4" />
          {t("markUnread")}
        </Button>
      )}

      {/* Marquer comme répondu */}
      {status !== "REPLIED" && status !== "ARCHIVED" && (
        <Button
          variant="primary"
          size="sm"
          disabled={isPending}
          onClick={() => doAction(markRepliedAction)}
        >
          <CheckCheck className="w-4 h-4" />
          {t("markReplied")}
        </Button>
      )}

      {/* Archiver */}
      {status !== "ARCHIVED" && (
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => doAction(archiveMessageAction)}
        >
          <Archive className="w-4 h-4" />
          {t("archive")}
        </Button>
      )}

      {/* Restaurer depuis archives */}
      {status === "ARCHIVED" && (
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => doAction(restoreMessageAction)}
        >
          <RotateCcw className="w-4 h-4" />
          {t("restore")}
        </Button>
      )}
    </div>
  );
}
