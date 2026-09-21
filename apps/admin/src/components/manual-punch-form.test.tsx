import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormState } from "../lib/crud-actions";
import { ManualPunchForm } from "./manual-punch-form";

afterEach(cleanup);

const workers = [
  { id: "W1", displayName: "山田" },
  { id: "W2", displayName: "鈴木" },
];

describe("ManualPunchForm", () => {
  it("拠点のアルバイト一覧を選択肢に出す", () => {
    render(<ManualPunchForm action={async () => ({})} workers={workers} />);
    expect(screen.getByRole("option", { name: "山田" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "鈴木" })).toBeInTheDocument();
  });

  it("送信するとアクションに値付き FormData が渡る", async () => {
    const action = vi.fn(async (_prev: FormState, _fd: FormData): Promise<FormState> => ({}));
    render(<ManualPunchForm action={action} workers={workers} />);
    fireEvent.change(screen.getByLabelText("アルバイト"), { target: { value: "W2" } });
    fireEvent.change(screen.getByLabelText("種別"), { target: { value: "CLOCK_OUT" } });
    fireEvent.change(screen.getByLabelText(/時刻/), { target: { value: "2026-08-25T09:00:00Z" } });
    fireEvent.change(screen.getByLabelText(/追加理由/), { target: { value: "打刻漏れのため追加" } });
    fireEvent.click(screen.getByRole("button", { name: "手動追加する" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    const submitted = action.mock.calls[0]![1];
    expect(submitted.get("workerId")).toBe("W2");
    expect(submitted.get("type")).toBe("CLOCK_OUT");
    expect(submitted.get("occurredAt")).toBe("2026-08-25T09:00:00Z");
    expect(submitted.get("note")).toBe("打刻漏れのため追加");
  });

  it("アクションがエラーを返すと表示する", async () => {
    const action = vi.fn(async (): Promise<FormState> => ({ error: "note: 必須です" }));
    render(<ManualPunchForm action={action} workers={workers} />);
    fireEvent.change(screen.getByLabelText(/時刻/), { target: { value: "2026-08-25T09:00:00Z" } });
    fireEvent.change(screen.getByLabelText(/追加理由/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "手動追加する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("note: 必須です");
  });
});
