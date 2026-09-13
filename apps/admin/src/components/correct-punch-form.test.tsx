import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormState } from "../lib/crud-actions";
import { CorrectPunchForm } from "./correct-punch-form";

afterEach(cleanup);

const values = { occurredAt: "2026-08-25T00:01:00Z", type: "CLOCK_IN" as const, workerName: "山田" };

describe("CorrectPunchForm", () => {
  it("対象と現在の記録を表示し、理由は必須入力", () => {
    render(<CorrectPunchForm action={async () => ({})} values={values} />);
    expect(screen.getByText(/山田/)).toBeInTheDocument();
    expect(screen.getByLabelText("補正後の時刻（UTC, ISO8601）")).toHaveValue(values.occurredAt);
    expect(screen.getByLabelText(/補正理由/)).toBeRequired();
  });

  it("送信するとアクションに値付き FormData が渡る", async () => {
    const action = vi.fn(async (_prev: FormState, _fd: FormData): Promise<FormState> => ({}));
    render(<CorrectPunchForm action={action} values={values} />);
    fireEvent.change(screen.getByLabelText("補正後の時刻（UTC, ISO8601）"), {
      target: { value: "2026-08-25T00:05:00Z" },
    });
    fireEvent.change(screen.getByLabelText(/補正理由/), { target: { value: "打刻漏れのため補正" } });
    fireEvent.click(screen.getByRole("button", { name: "補正する" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    const submitted = action.mock.calls[0]![1];
    expect(submitted.get("occurredAt")).toBe("2026-08-25T00:05:00Z");
    expect(submitted.get("note")).toBe("打刻漏れのため補正");
  });

  it("アクションがエラーを返すと表示する", async () => {
    const action = vi.fn(async (): Promise<FormState> => ({ error: "note: 必須です" }));
    render(<CorrectPunchForm action={action} values={values} />);
    fireEvent.change(screen.getByLabelText(/補正理由/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "補正する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("note: 必須です");
  });
});
