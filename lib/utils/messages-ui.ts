/**
 * Client-side helpers for messaging UI (formatting only; no API).
 */

export function formatMessageListTime(
  iso: string,
  locale: string = "en",
  yesterdayWord: string
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(d);
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return yesterdayWord;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d);
}

export function formatMessageTimestamp(iso: string, locale: string = "en"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayHeadingLabel(
  iso: string,
  locale: string,
  labels: { today: string; yesterday: string }
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round(
    (startOf(now).getTime() - startOf(d).getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return new Intl.DateTimeFormat(locale, opts).format(d);
}

export function groupMessagesByDay<T extends { createdAt: string }>(
  messages: T[]
): { dayKey: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const m of messages) {
    const key = dayKey(m.createdAt);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  const keys = [...map.keys()].sort();
  return keys.map((k) => {
    const items = map.get(k) ?? [];
    return {
      dayKey: k,
      items,
    };
  });
}
