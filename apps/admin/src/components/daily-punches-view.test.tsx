import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DailyPunchesView, type PunchRow } from "./daily-punches-view";

afterEach(cleanup);

const locations = [
  { id: "L1", name: "渋谷店" },
  { id: "L2", name: "Adelaide" },
];

describe("DailyPunchesView", () => {
  it("拠点未選択なら選択を促し、拠点リンクを出す", () => {
    render(<DailyPunchesView locations={locations} selectedLocationId={null} punches={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("拠点を選択");
    expect(screen.getByRole("link", { name: "渋谷店" })).toHaveAttribute("href", "/?location=L1");
  });

  it("選択済み・打刻あり: 拠点TZの時刻・種別・名前を表示", () => {
    const punches: PunchRow[] = [
      {
        id: "P1",
        type: "CLOCK_IN",
        occurredAt: "2026-08-25T00:30:00Z",
        timeZone: "Asia/Tokyo",
        workerName: "山田",
      },
    ];
    render(<DailyPunchesView locations={locations} selectedLocationId="L1" punches={punches} />);
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.getByText("出勤")).toBeInTheDocument();
    expect(screen.getByText("山田")).toBeInTheDocument();
  });

  it("選択済み・打刻なしはメッセージ", () => {
    render(<DailyPunchesView locations={locations} selectedLocationId="L1" punches={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("打刻はまだありません");
  });
});
