import { initTRPC } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { z } from "zod";
import { CounterDO } from "./CounterDO";

const t = initTRPC.context<Context>().create();
const publicProcedure = t.procedure;
const router = t.router;

const counterProcedure = publicProcedure
  .input(z.object({ counterSession: z.string().default("global") }))
  .use(async ({ ctx, next, input }) => {
    const id = ctx.env.COUNTER.idFromName(input.counterSession);
    const counter = ctx.env.COUNTER.get(id);

    return next({
      ctx: {
        counter,
      },
    });
  });

// Create a router with your API endpoints
const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name ?? "world"}!`,
      };
    }),
  getUser: publicProcedure.query(() => {
    return {
      name: "Cloudflare",
      id: 1,
    };
  }),
  // Add counter procedures that interact with the Durable Object
  counter: router({
    get: counterProcedure.query(async ({ ctx }) => {
      return await ctx.counter.value();
    }),
    increment: counterProcedure.mutation(async ({ ctx }) => {
      return await ctx.counter.increment();
    }),
    decrement: counterProcedure.mutation(async ({ ctx }) => {
      return await ctx.counter.decrement();
    }),
    reset: counterProcedure.mutation(async ({ ctx }) => {
      return await ctx.counter.reset();
    }),
  }),
});

export type AppRouter = typeof appRouter;

const createContext = (env: Env, req: Request) => ({
  env,
  req,
});
type Context = Awaited<ReturnType<typeof createContext>>;

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
