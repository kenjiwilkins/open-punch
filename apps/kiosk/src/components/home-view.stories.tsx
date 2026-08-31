import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HomeView } from "./home-view";

const meta = {
  title: "kiosk/pages/HomeView",
  component: HomeView,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HomeView>;

export default meta;
type Story = StoryObj<typeof meta>;

const workers = [
  { id: "W1", displayName: "青山", nameKana: "あおやま" },
  { id: "W2", displayName: "井上", nameKana: "いのうえ" },
  { id: "W3", displayName: "遠藤", nameKana: "えんどう" },
  { id: "W4", displayName: "小林", nameKana: "こばやし" },
  { id: "W5", displayName: "佐藤", nameKana: "さとう" },
  { id: "W6", displayName: "田中", nameKana: "たなか" },
];

export const WithWorkers: Story = { args: { workers } };

export const Empty: Story = { args: { workers: [] } };

export const ErrorState: Story = {
  name: "Error",
  args: { workers: [], error: "サーバーに接続できませんでした" },
};
