/**
 * 打刻時刻（UTC）から業務日（"YYYY-MM-DD"）を算出する（docs/03-data-model.md）。
 *
 * タイムゾーンは拠点（Location）単位の IANA 名で与える。オーストラリアは DST・30分刻み
 * があるため、固定オフセットの引き算は使わない。代わりに `Intl.DateTimeFormat`（Node標準・
 * 追加依存なし・フルICUでDST対応）で現地の壁時計を取り、締め時刻ぶんは**カレンダー演算**で
 * 前日補正する（instant 演算を跨がないので DST 境界でも安全）。
 *
 * @param occurredAt 打刻の瞬間（UTC の ISO文字列 or Date）
 * @param timeZone   拠点の IANA タイムゾーン名（例: "Asia/Tokyo", "Australia/Sydney"）
 * @param cutoffHour 業務日の締め時刻（時, 0-23）。この時刻より前の打刻は前日の業務日に属する。
 * @returns 現地TZ基準の業務日 "YYYY-MM-DD"
 */
export function computeBusinessDate(
  occurredAt: string | Date,
  timeZone: string,
  cutoffHour = 0,
): string {
  const date = typeof occurredAt === "string" ? new Date(occurredAt) : occurredAt;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`computeBusinessDate: invalid date: ${String(occurredAt)}`);
  }
  if (!Number.isInteger(cutoffHour) || cutoffHour < 0 || cutoffHour > 23) {
    throw new Error(`computeBusinessDate: cutoffHour must be an integer 0-23: ${cutoffHour}`);
  }

  const local = getLocalParts(date, timeZone);

  // 締め時刻より前なら暦日を1日戻す（純粋なカレンダー演算。TZ変換を跨がない）。
  if (local.hour < cutoffHour) {
    const rolled = new Date(Date.UTC(local.year, local.month - 1, local.day));
    rolled.setUTCDate(rolled.getUTCDate() - 1);
    return formatYmd(rolled.getUTCFullYear(), rolled.getUTCMonth() + 1, rolled.getUTCDate());
  }
  return formatYmd(local.year, local.month, local.day);
}

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

/** UTC 時刻を、指定 IANA タイムゾーンの現地の壁時計（年・月・日・時）に変換する。 */
function getLocalParts(date: Date, timeZone: string): LocalParts {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new Error(`computeBusinessDate: invalid IANA timeZone: ${timeZone}`);
  }

  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((p) => p.type === type)?.value;
    if (value === undefined) {
      throw new Error(`computeBusinessDate: missing part "${type}" for timeZone ${timeZone}`);
    }
    return Number(value);
  };

  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
  };
}

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
