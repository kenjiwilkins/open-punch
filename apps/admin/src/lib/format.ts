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
