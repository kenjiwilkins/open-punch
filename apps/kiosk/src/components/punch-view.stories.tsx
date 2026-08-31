import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkerStatus } from "../gql/graphql";
import type { PunchResult } from "../lib/actions";
import { PunchView } from "./punch-view";

const meta = {
  title: "kiosk/pages/PunchView",
  component: PunchView,
  parameters: { layout: "fullscreen" },
  args: {
    workerId: "W1",
    displayName: "山田 太郎",
    onPunch: async () => ({ ok: true }) as PunchResult,
  },
} satisfies Meta<typeof PunchView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotClockedIn: Story = { args: { status: WorkerStatus.NotClockedIn } };

export const Working: Story = { args: { status: WorkerStatus.Working } };

export const ErrorState: Story = {
  name: "Error",
  args: { status: WorkerStatus.NotClockedIn, error: "状態を取得できませんでした" },
};
