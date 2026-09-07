import { builder } from "./builder";
import "./types"; // 型・enum を builder に登録（副作用）
import "./resolvers"; // Query/Mutation の operations を登録（副作用）
import "./admin"; // 社員向け CRUD（Query/Mutation フィールド追加）を登録（副作用）

export const schema = builder.toSchema();
