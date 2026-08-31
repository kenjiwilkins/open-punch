import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { WorkerStatus } from "../gql/graphql";
import type { PunchResult } from "../lib/actions";
import { PunchPanel } from "./punch-panel";

const meta = {
  title: "kiosk/PunchPanel",
  component: PunchPanel,
  parameters: { layout: "centered" },
  args: {
    workerId: "W1",
    displayName: "山田 太郎",
    onPunch: async () => ({ ok: true }) as PunchResult,
  },
} satisfies Meta<typeof PunchPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// 未出勤 → 「出勤」ボタン
export const NotClockedIn: Story = { args: { initialStatus: WorkerStatus.NotClockedIn } };

// 勤務中 → 「退勤」ボタン（destructive）
export const Working: Story = { args: { initialStatus: WorkerStatus.Working } };

// 送信中（解決しない Promise でボタン無効化を表示）
export const Submitting: Story = {
  args: {
    initialStatus: WorkerStatus.NotClockedIn,
    onPunch: () => new Promise<PunchResult>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "出勤" }));
    await expect(canvas.getByRole("button", { name: "送信中…" })).toBeDisabled();
  },
};

// 完了表示
export const Done: Story = {
  args: { initialStatus: WorkerStatus.NotClockedIn },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "出勤" }));
    await expect(await canvas.findByText("出勤しました")).toBeInTheDocument();
  },
};

// エラー表示
export const ErrorState: Story = {
  name: "Error",
  args: {
    initialStatus: WorkerStatus.NotClockedIn,
    onPunch: async () => ({ ok: false, message: "ネットワークエラー" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "出勤" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("ネットワークエラー");
  },
};
