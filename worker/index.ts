import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { CounterDO } from "./CounterDO";
import { appRouter, Context } from "../trpc";


const createContext = (env: Env, req: Request): Context => ({
  env,
  req,
});

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle tRPC requests
    if (url.pathname.startsWith("/trpc")) {
      return fetchRequestHandler({
        endpoint: "/trpc",
        req: request,
        router: appRouter,
        createContext: () => createContext(env, request),
      });
    }

    // Legacy API endpoint for backwards compatibility
    if (url.pathname.startsWith("/api/")) {
      return Promise.resolve(
        Response.json({
          name: "Cloudflare",
        })
      );
    }

    return Promise.resolve(new Response(null, { status: 404 }));
  },
};

// Export the Durable Object class
export { CounterDO };
