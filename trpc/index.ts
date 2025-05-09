import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { EventEmitter, on } from "node:events";

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

export const appRouter = router({
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
      return {
        counter: await ctx.counter.value(),
      };
    }),
    increment: counterProcedure.mutation(async ({ ctx }) => {
      return {
        counter: await ctx.counter.increment(),
      };
    }),
    decrement: counterProcedure.mutation(async ({ ctx }) => {
      return {
        counter: await ctx.counter.decrement(),
      };
    }),
    reset: counterProcedure.mutation(async ({ ctx }) => {
      return {
        counter: await ctx.counter.reset(),
      };
    }),
    watch: counterProcedure.subscription(async function* (opts) {
      const { counter } = opts.ctx;

      // Because we want to proxy in a typesafe way from tRPC
      // we have to set up a WebSocket connection to the Durable Object directly
      // Normally you would pass a request directly from the worker to the Durable Object 
      // which I believe means the worker can normnally shut down, but not here
      // This is probably a bit of a hack as a result
      const headers = new Headers();
      headers.set("Upgrade", "websocket");
      const response = await counter.fetch("http://do/subscribe", {
        headers: headers,
      });

      if (!response.webSocket) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upgrade to WebSocket",
        });
      }

      // We have to accept here as well on the durable object to establish the connection.
      // The DO will hibernate but the worker will probably not which may not be ideal for costs
      response.webSocket.accept();

      // Need node compat in cloudflare for this to work
      const ee = new EventEmitter();
      response.webSocket.addEventListener("message", (event) => {
        ee.emit("message", event.data);
      });

      // WS on Durable Objects can't be type-safe, but we can at least validate the data
      const Schema = z.object({
        count: z.number(),
      });

      // EventSource does not queue messages so we must subscribe a 
      // little after we start reading it to not miss the initial state
      setTimeout(() => {
        response.webSocket!.send("SUBSCRIBE");
      }, 0);

      try {
        console.log("[AppRouter:Counter:watch] Listening for messages");

        for await (const vals of on(ee, "message")) {
          console.log("[AppRouter:Counter:watch] Received message", vals);

          for (const val of vals) {
            yield Schema.parse(JSON.parse(val));
          }
        }
      } finally {
        console.log("[AppRouter:Counter:watch] Cleaning up WebSocket");
        response.webSocket.close();
        ee.removeAllListeners("message");
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;

export type Context = {
  env: Env;
  req: Request;
};
