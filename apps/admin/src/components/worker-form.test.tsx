import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("送信するとアクションに値付き FormData が渡る", async () => {
    const action = vi.fn(async (_prev: FormState, _fd: FormData): Promise<FormState> => ({}));
    render(
      <WorkerForm
        action={action}
        submitLabel="作成"
        values={{ name: "鈴木 花子", displayName: "鈴木", nameKana: "すずき" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "作成" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    const submitted = action.mock.calls[0]![1];
    expect(submitted.get("displayName")).toBe("鈴木");
    expect(submitted.get("nameKana")).toBe("すずき");
  });

  it("アクションが BAD_USER_INPUT を返すと表示する", async () => {
    const action = vi.fn(async (): Promise<FormState> => ({ error: "nameKana: 必須です" }));
    // 必須項目は満たしているが、サーバー側検証で弾かれるケース
    render(
      <WorkerForm
        action={action}
        submitLabel="作成"
        values={{ name: "山田", displayName: "山田", nameKana: "やまだ" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "作成" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("nameKana: 必須です");
  });
});
