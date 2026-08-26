// ドメインの中核型（docs/03-data-model.md）。
// TS enum は使わず、const オブジェクト + union 型で表現する
// （isolatedModules / verbatimModuleSyntax と相性が良く、値と型を両立できる）。

/** 打刻種別。MVP は出勤/退勤の2種のみ（休憩は「一旦退勤」で運用）。 */
export const PunchType = {
  CLOCK_IN: "CLOCK_IN",
  CLOCK_OUT: "CLOCK_OUT",
} as const;
export type PunchType = (typeof PunchType)[keyof typeof PunchType];

/** アルバイトの当日状態（打刻履歴から算出する。保存はしない）。 */
export const WorkerStatus = {
  NOT_CLOCKED_IN: "NOT_CLOCKED_IN",
  WORKING: "WORKING",
  CLOCKED_OUT: "CLOCKED_OUT",
} as const;
export type WorkerStatus = (typeof WorkerStatus)[keyof typeof WorkerStatus];

/** 社員の権限。MVP は全員 ADMIN（分岐なし。将来 MANAGER 等を追加余地）。 */
export const EmployeeRole = {
  ADMIN: "ADMIN",
} as const;
export type EmployeeRole = (typeof EmployeeRole)[keyof typeof EmployeeRole];

/**
 * 拠点。タイムゾーンを持つ単位（docs/03-data-model.md）。
 * 日本とオーストラリアで使うため、拠点ごとに IANA タイムゾーンを保持する。
 */
export interface Location {
  locationId: string;
  name: string;
  /** IANA タイムゾーン名（例: "Asia/Tokyo", "Australia/Sydney"）。businessDate 算出の基準。 */
  timeZone: string;
  /** 営業日の締め時刻（時, 0-23）。MVP 既定は 0（暦日）。 */
  businessDayCutoffHour: number;
  /** 国コード（例: "JP", "AU"）。任意。 */
  country?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** アルバイト。Cognito を持たず DynamoDB レコードのみ。 */
export interface Worker {
  workerId: string;
  /** 所属拠点。businessDate はこの拠点の TZ で算出する。 */
  locationId: string;
  name: string;
  displayName: string;
  nameKana: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 社員。Cognito ユーザーに紐づく。 */
export interface Employee {
  sub: string;
  email: string;
  name: string;
  role: EmployeeRole;
  createdAt: string;
}

/** 打刻イベント。時刻はサーバーが決める（occurredAt は UTC）。 */
export interface PunchEvent {
  id: string;
  workerId: string;
  /** 打刻が起きた拠点。 */
  locationId: string;
  type: PunchType;
  /** 打刻の瞬間。UTC の ISO8601（"...Z"）。 */
  occurredAt: string;
  /** 打刻時の拠点TZのスナップショット（後から拠点TZを変えても過去を再現できる）。 */
  timeZone: string;
  /** 拠点TZ基準の営業日 "YYYY-MM-DD"。打刻時に確定保存。 */
  businessDate: string;
  source: "KIOSK";
  deviceId?: string;
  corrected: boolean;
  correctedBy?: string;
  note?: string;
  createdAt: string;
}
