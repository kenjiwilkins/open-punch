import { PunchType, WorkerStatus } from "./types";

/**
 * 当日の打刻列（時刻昇順）からアルバイトの状態を算出する（docs/03-data-model.md）。
 * 状態は「最新イベント」で決まる。CLOCK_OUT 後にまた CLOCK_IN すれば WORKING に戻る
 * （＝休憩・中抜け・再出勤）。
 *
 * @param punchesAsc 当日の打刻（occurredAt 昇順）
 */
export function computeWorkerStatus(
  punchesAsc: readonly { type: PunchType }[],
): WorkerStatus {
  const last = punchesAsc.at(-1);
  if (last === undefined) return WorkerStatus.NOT_CLOCKED_IN;
  return last.type === PunchType.CLOCK_IN ? WorkerStatus.WORKING : WorkerStatus.CLOCKED_OUT;
}
