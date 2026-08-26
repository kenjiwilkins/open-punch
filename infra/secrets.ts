// キオスク（kiosk）が GraphQL の公開オペレーションを叩くための API キー。
// 値はステージごとに `sst secret set KioskApiKey <値>` で設定する。
// beta の鍵で production は叩けない（ステージ分離。docs/02-architecture.md）。
export const kioskApiKey = new sst.Secret("KioskApiKey");
