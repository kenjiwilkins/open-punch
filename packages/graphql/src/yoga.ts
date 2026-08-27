import { createYoga } from "graphql-yoga";
import { buildContext, type ContextDeps } from "./context";
import { schema } from "./schema";

/** GraphQL Yoga のインスタンスを作る。リクエストごとに認証 context を構築する。 */
export function createYogaHandler(deps: ContextDeps) {
  return createYoga({
    schema,
    graphqlEndpoint: "/graphql",
    landingPage: false,
    context: ({ request }) => buildContext(headersToObject(request.headers), deps),
  });
}

function headersToObject(headers: Headers): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}
