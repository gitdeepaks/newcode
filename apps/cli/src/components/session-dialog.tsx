import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { useEffect, useState } from "react";
import { z } from "zod";
import { client } from "../lib/client";
import { SearchListDialog } from "./search-list-dialog";

const messagePreviewPayloadSchema = z.object({
  role: z.literal("user"),
  parts: z.array(
    z.object({
      type: z.literal("text"),
      text: z.string().trim().min(1),
    }),
  ),
});

type SessionOption = {
  id: string;
  label: string;
  metadata: string;
  group: string;
};

type SessionDialogProps = {
  onSessionSelect?: (id: string) => void;
};

export function SessionDialog({ onSessionSelect }: SessionDialogProps) {
  const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      const res = await client.sessions.$get();
      if (cancelled) {
        return;
      }
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (cancelled) {
        return;
      }

      const options = await Promise.all(
        data.sessions.map(async (session) => {
          const updatedAt = new Date(session.updatedAt);

          return {
            id: session.id,
            label: await resolveSessionLabel(session.id, session.title),
            metadata: formatSessionMetadata(updatedAt),
            group: formatSessionGroup(updatedAt),
          };
        }),
      );
      if (cancelled) {
        return;
      }

      setSessionOptions(options);
      setLoading(false);
    }

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SearchListDialog
      title="Sessions"
      options={sessionOptions}
      maxWidth="96%"
      height={16}
      rowLayout="title-metadata"
      groupColor="#BD93F9"
      placeholder="Search"
      emptyMessage={loading ? "Loading sessions..." : "No sessions found"}
      footer={
        <text>
          <strong>delete</strong>
          <span fg="#6E7681"> ctrl+d   </span>
          <strong>rename</strong>
          <span fg="#6E7681"> ctrl+r</span>
        </text>
      }
      onOptionSelect={(option) => onSessionSelect?.(option.id)}
    />
  );
}

function formatSessionGroup(date: Date) {
  if (isToday(date)) {
    return "Today";
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }

  return format(date, "EEE MMM d, yyyy");
}

function formatSessionMetadata(date: Date) {
  if (isToday(date)) {
    return format(date, "h:mm a");
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

async function resolveSessionLabel(id: string, title: string | null) {
  if (title && title !== "Session") {
    return title;
  }

  const preview = await getSessionMessagePreview(id);
  return preview ?? title ?? "Session";
}

async function getSessionMessagePreview(id: string) {
  const res = await client.sessions[":id"].messages.$get({ param: { id } });
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  for (const message of data.messages) {
    const result = messagePreviewPayloadSchema.safeParse(message.payload);
    if (result.success) {
      return result.data.parts[0]?.text ?? null;
    }
  }

  return null;
}
