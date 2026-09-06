import type { CodegenConfig } from "@graphql-codegen/cli";

// packages/graphql が emit した SDL から admin 用の型付きクライアントを生成する。
const config: CodegenConfig = {
  schema: "../../packages/graphql/schema.graphql",
  documents: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
  ignoreNoDocuments: true,
  generates: {
    "src/gql/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
      },
      config: {
        useTypeImports: true,
      },
    },
  },
};

export default config;
