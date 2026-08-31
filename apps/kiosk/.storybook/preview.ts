import type { Preview } from "@storybook/nextjs-vite";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    // App Router を使うため next/navigation（useRouter 等）のコンテキストをマウントする。
    // これが無いと "invariant expected app router to be mounted" になる。
    nextjs: { appDirectory: true },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    // iPad（タップ前提）で確認しやすいビューポート。
    viewport: {
      viewports: {
        ipadLandscape: {
          name: "iPad 横",
          styles: { width: "1024px", height: "768px" },
          type: "tablet",
        },
        ipadPortrait: {
          name: "iPad 縦",
          styles: { width: "768px", height: "1024px" },
          type: "tablet",
        },
      },
      defaultViewport: "ipadLandscape",
    },
  },
};

export default preview;
