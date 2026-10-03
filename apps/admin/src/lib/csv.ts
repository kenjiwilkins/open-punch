// CSV 生成（server 非依存の純関数, #21/#22）。RFC 4180 準拠のエスケープ + Excel 向け UTF-8 BOM。

export const UTF8_BOM = "﻿";

/** カンマ・二重引用符・改行を含むフィールドは引用符で囲み、内部の `"` は `""` にする。 */
export function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * 行の配列を CSV 文字列にする。改行は CRLF、末尾に改行は付けない。
 * Excel（日本語ロケール）で文字化けしないよう先頭に UTF-8 BOM を付ける。
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return `${UTF8_BOM}${rows.map((r) => r.map(csvEscape).join(",")).join("\r\n")}`;
}
