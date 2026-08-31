import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkerGrid } from "./worker-grid";

const meta = {
  title: "kiosk/WorkerGrid",
  component: WorkerGrid,
  parameters: { layout: "padded" },
} satisfies Meta<typeof WorkerGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const many = [
  { id: "W1", displayName: "青山", nameKana: "あおやま" },
  { id: "W2", displayName: "井上", nameKana: "いのうえ" },
  { id: "W3", displayName: "受付A", nameKana: "うけつけ" },
  { id: "W4", displayName: "遠藤", nameKana: "えんどう" },
  { id: "W5", displayName: "小林", nameKana: "こばやし" },
  { id: "W6", displayName: "佐藤", nameKana: "さとう" },
  { id: "W7", displayName: "鈴木T", nameKana: "すずきT" },
  { id: "W8", displayName: "鈴木Y", nameKana: "すずきY" },
  { id: "W9", displayName: "田中", nameKana: "たなか" },
  { id: "W10", displayName: "中村", nameKana: "なかむら" },
  { id: "W11", displayName: "橋本", nameKana: "はしもと" },
  { id: "W12", displayName: "山本", nameKana: "やまもと" },
];

export const Many: Story = { args: { workers: many } };

export const Single: Story = { args: { workers: many.slice(0, 1) } };

export const Empty: Story = { args: { workers: [] } };
