import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
});
