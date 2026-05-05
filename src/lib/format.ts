export function formatMin(min: number): string {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = min < 0 ? "△" : "";
  if (h === 0) return `${sign}${m}分`;
  return `${sign}${h}時間${m > 0 ? `${m}分` : ""}`;
}

export function formatYen(yen: number): string {
  const abs = Math.abs(yen);
  const sign = yen < 0 ? "△" : "";
  return `${sign}${abs.toLocaleString("ja-JP")}円`;
}

export function formatSignedMin(min: number): string {
  return min > 0 ? `+${formatMin(min)}` : formatMin(min);
}

export function formatSignedYen(yen: number): string {
  return yen > 0 ? `+${formatYen(yen)}` : formatYen(yen);
}
