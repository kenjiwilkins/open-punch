// 表示整形（server 非依存の純関数）。

/** UTC の ISO 文字列を拠点の IANA タイムゾーンで HH:mm 表示にする。 */
export function formatTimeInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function punchTypeLabel(type: "CLOCK_IN" | "CLOCK_OUT"): string {
  return type === "CLOCK_IN" ? "出勤" : "退勤";
}

/** ミリ秒を "H:mm" 表示にする（例: 8時間30分 → "8:30"）。負値は "0:00" に丸める。 */
export function formatDurationHM(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
