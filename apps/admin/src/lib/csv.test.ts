import { describe, expect, it } from "vitest";
import { UTF8_BOM, csvEscape, toCsv } from "./csv";

describe("csvEscape", () => {
  it("特殊文字が無ければそのまま", () => {
    expect(csvEscape("2026-08-25")).toBe("2026-08-25");
    expect(csvEscape("山田 太郎")).toBe("山田 太郎");
    expect(csvEscape("")).toBe("");
  });

  it("カンマ・改行・CR を含むと引用符で囲む", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape("a\nb")).toBe('"a\nb"');
    expect(csvEscape("a\rb")).toBe('"a\rb"');
  });

  it("二重引用符は2つにして全体を囲む", () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });
});

describe("toCsv", () => {
  it("先頭に UTF-8 BOM、行は CRLF 区切り、末尾に改行なし", () => {
    const csv = toCsv([
      ["日付", "稼働時間"],
      ["2026-08-25", "8:30"],
    ]);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    expect(csv.slice(1)).toBe("日付,稼働時間\r\n2026-08-25,8:30");
    expect(csv.endsWith("\r\n")).toBe(false);
  });

  it("BOM は UTF-8 で EF BB BF の3バイトになる（Excel が UTF-8 と判定できる）", () => {
    const bytes = new TextEncoder().encode(toCsv([["あ"]]));
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("空の行リストでも BOM だけを返す", () => {
    expect(toCsv([])).toBe(UTF8_BOM);
  });

  it("特殊文字を含むフィールドはエスケープされ、列数が崩れない", () => {
    const csv = toCsv([["a,b", 'c"d', "e"]]);
    expect(csv.slice(1)).toBe('"a,b","c""d",e');
  });
});
