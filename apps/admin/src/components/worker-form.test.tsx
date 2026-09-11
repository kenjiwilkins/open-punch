import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { FormState } from "../lib/crud-actions";
import { WorkerForm } from "./worker-form";

afterEach(cleanup);

const noop = async (): Promise<FormState> => ({});

describe("WorkerForm", () => {
  it("氏名・表示名・かなの入力を表示する", () => {
    render(<WorkerForm action={noop} submitLabel="作成" />);
    expect(screen.getByLabelText("氏名")).toBeInTheDocument();
    expect(screen.getByLabelText("表示名")).toBeInTheDocument();
    expect(screen.getByLabelText("かな")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
  });

  it("編集時は初期値と有効チェックを出す", () => {
    render(
      <WorkerForm
        action={noop}
        submitLabel="更新"
        showActive
        values={{ name: "山田 太郎", displayName: "山田", nameKana: "やまだ", active: true }}
      />,
    );
    expect(screen.getByLabelText("表示名")).toHaveValue("山田");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});
