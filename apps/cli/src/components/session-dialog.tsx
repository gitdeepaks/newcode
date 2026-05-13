import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { useEffect, useState } from "react";
import { client } from "../lib/client";
import { SearchListDialog } from "./search-list-dialog";

type SessionOption = {
  id: string;
  label: string;
  description: string;
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

      setSessionOptions(
        data.sessions.map((session) => {
          const updatedAt = new Date(session.updatedAt);

          return {
            id: session.id,
            label: session.title ?? "Session",
            description: formatSessionId(session.id),
            metadata: formatDistanceToNow(updatedAt, { addSuffix: true }),
            group: formatSessionGroup(updatedAt),
          };
        }),
      );
      setLoading(false);
    }

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SearchListDialog
      title="Session"
      options={sessionOptions}
      maxWidth={80}
      placeholder="Search sessions"
      emptyMessage={loading ? "Loading sessions..." : "No sessions found"}
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

function formatSessionId(id: string) {
  if (id.length <= 12) {
    return id;
  }

  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}
