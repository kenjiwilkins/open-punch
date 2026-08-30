import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WorkerGrid } from "./worker-grid";

afterEach(cleanup);

const workers = [
  { id: "W1", displayName: "山田", nameKana: "やまだ" },
  { id: "W2", displayName: "鈴木", nameKana: "すずき" },
];

describe("WorkerGrid", () => {
  it("displayName / nameKana を表示し /punch/:id へリンクする", () => {
    render(<WorkerGrid workers={workers} />);
    const yamada = screen.getByRole("link", { name: "山田 の打刻へ" });
    expect(yamada).toHaveAttribute("href", "/punch/W1");
    expect(yamada).toHaveTextContent("山田");
    expect(yamada).toHaveTextContent("やまだ");
  });

  it("渡された順序（かな順）を保つ", () => {
    render(<WorkerGrid workers={workers} />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/punch/W1", "/punch/W2"]);
  });

  it("空なら未登録メッセージを出し、リンクは無い", () => {
    render(<WorkerGrid workers={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("有効なアルバイトが登録されていません");
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
