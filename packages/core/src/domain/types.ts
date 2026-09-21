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
  /** KIOSK: アルバイトの打刻。MANUAL: 社員が createManualPunch で追加。 */
  source: "KIOSK" | "MANUAL";
  deviceId?: string;
  corrected: boolean;
  correctedBy?: string;
  note?: string;
  createdAt: string;
}

/** PunchAudit の補正種別。DELETE は将来の取り消し機能用に予約（MVP未実装）。 */
export const PunchAuditAction = {
  CORRECT: "CORRECT",
  MANUAL_ADD: "MANUAL_ADD",
} as const;
export type PunchAuditAction = (typeof PunchAuditAction)[keyof typeof PunchAuditAction];

/** PunchAudit の前後スナップショット。 */
export interface PunchAuditSnapshot {
  occurredAt: string;
  type: PunchType;
}

/**
 * 打刻補正・手動追加の監査履歴（append-only、鉄則8）。
 * 対象 PunchEvent の更新（or 新規作成）と同一 TransactWriteItems で書く。
 */
export interface PunchAudit {
  /** 監査レコード自身の ID（ULID）。SK の一意性に使う。 */
  id: string;
  /** 対象アルバイト（PunchEvent と同じ PK に紐づく）。 */
  workerId: string;
  action: PunchAuditAction;
  /** 対象の PunchEvent ID（手動追加は新規作成した PunchEvent の ID）。 */
  targetPunchId: string;
  /** 変更前スナップショット（手動追加は元イベントが無いので undefined）。 */
  before?: PunchAuditSnapshot;
  after: PunchAuditSnapshot;
  /** 実施した社員（Cognito sub）。 */
  performedBy: string;
  /** 理由（必須）。 */
  note: string;
  createdAt: string;
}
