import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormState } from "../lib/crud-actions";
import { LocationForm } from "./location-form";

afterEach(cleanup);

const noop = async (): Promise<FormState> => ({});

describe("LocationForm", () => {
  it("フィールドと送信ボタンを表示する", () => {
    render(<LocationForm action={noop} submitLabel="作成" />);
    expect(screen.getByLabelText("拠点名")).toBeInTheDocument();
    expect(screen.getByLabelText("タイムゾーン（IANA 名）")).toBeInTheDocument();
    expect(screen.getByLabelText("締め時刻（0–23）")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
  });

  it("編集時は初期値を入れ、active を出す", () => {
    render(
      <LocationForm
        action={noop}
        submitLabel="更新"
        showActive
        values={{
          name: "渋谷店",
          timeZone: "Asia/Tokyo",
          businessDayCutoffHour: 3,
          country: "JP",
          active: true,
        }}
      />,
    );
    expect(screen.getByLabelText("拠点名")).toHaveValue("渋谷店");
    expect(screen.getByLabelText("締め時刻（0–23）")).toHaveValue(3);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("送信するとアクションに値付き FormData が渡る", async () => {
    const action = vi.fn(async (_prev: FormState, _fd: FormData): Promise<FormState> => ({}));
    render(
      <LocationForm
        action={action}
        submitLabel="作成"
        values={{ name: "渋谷", timeZone: "Asia/Tokyo", businessDayCutoffHour: 5 }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "作成" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    const submitted = action.mock.calls[0]![1];
    expect(submitted.get("name")).toBe("渋谷");
    expect(submitted.get("timeZone")).toBe("Asia/Tokyo");
  });

  it("アクションが BAD_USER_INPUT を返すと画面に表示する", async () => {
    const action = vi.fn(async (): Promise<FormState> => ({ error: "timeZone: 無効です" }));
    render(
      <LocationForm action={action} submitLabel="作成" values={{ name: "x", timeZone: "bad" }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "作成" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("timeZone: 無効です");
  });
});
