import { initTRPC } from "@trpc/server";
import { z } from "zod";

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
        counter: await ctx.counter.value()
      };
    }),
    increment: counterProcedure.mutation(async ({ ctx }) => {
      return {
        counter: await ctx.counter.increment()
      };
    }),
    decrement: counterProcedure.mutation(async ({ ctx }) => {
      return {
        counter: await ctx.counter.decrement()
      };
    }),
    reset: counterProcedure.mutation(async ({ ctx }) => {
      return {
        counter: await ctx.counter.reset()
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;

export type Context = {
  env: Env;
  req: Request;
};
