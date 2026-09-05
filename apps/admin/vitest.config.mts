import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      // server-only はテスト環境では throw するため空モジュールに差し替える。
      "server-only": fileURLToPath(new URL("./test/noop.ts", import.meta.url)),
    },
  },
});
