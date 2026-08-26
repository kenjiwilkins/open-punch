import { defineConfig } from "vitest/config";

// graphql は単一インスタンスに固定する（Pothos とテストで別 realm を掴むと
// "Cannot use GraphQLSchema from another module or realm" になるため）。
export default defineConfig({
  resolve: { dedupe: ["graphql", "@pothos/core"] },
});
