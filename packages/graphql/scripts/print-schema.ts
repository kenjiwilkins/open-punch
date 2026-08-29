import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { printSchema } from "graphql";
import { schema } from "../src/schema";

// コードファースト（Pothos）の schema を SDL に書き出す。
// GraphQL Code Generator（kiosk）がこの SDL を読んで型付きクライアントを生成する。
const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "schema.graphql");

writeFileSync(outPath, `${printSchema(schema)}\n`, "utf8");
console.log(`wrote SDL: ${outPath}`);
