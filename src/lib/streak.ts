export function toTokyoDateStr(d: Date | string): string {
  const dateObj = typeof d === "string" ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateObj);
  
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  
  return `${y}-${m}-${day}`;
}

export function calculateStreak(dates: (Date | string)[]): number {
  if (dates.length === 0) return 0;

  const uniqueDates = [...new Set(dates.map(toTokyoDateStr))].sort().reverse();

  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  const todayStr = toTokyoDateStr(today);
  const yestStr = toTokyoDateStr(yesterday);

  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yestStr) return 0;

  let streak = 0;
  let prev: string | null = null;

  for (const dateStr of uniqueDates) {
    if (prev === null) {
      streak = 1;
      prev = dateStr;
    } else {
      const d1 = new Date(prev + "T00:00:00+09:00");
      const d2 = new Date(dateStr + "T00:00:00+09:00");
      const diff = Math.round((d1.getTime() - d2.getTime()) / 86_400_000);
      if (diff === 1) {
        streak++;
        prev = dateStr;
      } else {
        break;
      }
    }
  }

  return streak;
}
