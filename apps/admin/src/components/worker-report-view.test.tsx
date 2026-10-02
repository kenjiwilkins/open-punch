import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WorkerReportView, type WorkerReportDay } from "./worker-report-view";

afterEach(cleanup);

const days: WorkerReportDay[] = [
  {
    businessDate: "2026-08-25",
    totalMs: 7 * 3600_000,
    periods: [
      {
        businessDate: "2026-08-25",
        clockInAt: "2026-08-25T00:00:00Z", // 09:00 JST
        clockOutAt: "2026-08-25T03:00:00Z", // 12:00 JST
        durationMs: 3 * 3600_000,
      },
      {
        businessDate: "2026-08-25",
        clockInAt: "2026-08-25T04:00:00Z", // 13:00 JST
        clockOutAt: "2026-08-25T08:00:00Z", // 17:00 JST
        durationMs: 4 * 3600_000,
      },
    ],
  },
  {
    businessDate: "2026-08-26",
    totalMs: 0,
    periods: [
      { businessDate: "2026-08-26", clockInAt: "2026-08-26T00:00:00Z", clockOutAt: null, durationMs: null },
    ],
  },
];

describe("WorkerReportView", () => {
  it("打刻が無ければメッセージを出す", () => {
    render(<WorkerReportView days={[]} totalMs={0} timeZone="Asia/Tokyo" csvHref="/x" />);
    expect(screen.getByRole("status")).toHaveTextContent("指定期間の打刻はありません");
  });

  it("日別の期間（中抜けは複数行）を拠点TZで表示し、日別合計・期間合計を出す", () => {
    render(<WorkerReportView days={days} totalMs={7 * 3600_000} timeZone="Asia/Tokyo" csvHref="/x" />);
    expect(screen.getByText("2026-08-25")).toBeInTheDocument();
    expect(screen.getAllByText("09:00")).toHaveLength(2); // 25日の1本目 + 26日（未退勤）の出勤
    expect(screen.getByText("17:00")).toBeInTheDocument();
    expect(screen.getByText("3:00")).toBeInTheDocument();
    expect(screen.getByText("4:00")).toBeInTheDocument();
    // 日別合計 7:00 と期間合計 7:00
    expect(screen.getAllByText("7:00")).toHaveLength(2);
  });

  it("未退勤は「未退勤」と表示し、時間は確定させない", () => {
    render(<WorkerReportView days={days} totalMs={7 * 3600_000} timeZone="Asia/Tokyo" csvHref="/x" />);
    expect(screen.getByText("未退勤")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("CSV ダウンロードリンクを出す", () => {
    render(<WorkerReportView days={days} totalMs={0} timeZone="Asia/Tokyo" csvHref="/api/reports/worker-punches?a=1" />);
    expect(screen.getByRole("link", { name: "CSVダウンロード" })).toHaveAttribute(
      "href",
      "/api/reports/worker-punches?a=1",
    );
  });
});
