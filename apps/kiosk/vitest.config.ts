import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // server-only はテスト環境（node）では throw するため空モジュールに差し替える。
      "server-only": fileURLToPath(new URL("./test/noop.ts", import.meta.url)),
    },
  },
});
