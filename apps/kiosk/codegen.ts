import type { CodegenConfig } from "@graphql-codegen/cli";

// packages/graphql が emit した SDL から、kiosk 用の型付きクライアント（client-preset /
// TypedDocumentNode）を生成する。`pnpm codegen` で SDL 再生成 → ここが走る。
const config: CodegenConfig = {
  schema: "../../packages/graphql/schema.graphql",
  documents: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
  ignoreNoDocuments: true,
  generates: {
    "src/gql/": {
      preset: "client",
      presetConfig: {
        // フラグメントマスキングは使わない（結果をそのまま扱う）。
        fragmentMasking: false,
      },
      config: {
        useTypeImports: true,
      },
    },
  },
};

export default config;
