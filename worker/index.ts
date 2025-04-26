import { initTRPC } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { z } from 'zod';
import { CounterDO } from './CounterDO';

// Define environment interface with Durable Object binding
interface Env {
  COUNTER: DurableObjectNamespace;
}

// Create a tRPC instance
const t = initTRPC.context<Context>().create();

// Define procedures
const publicProcedure = t.procedure;
const router = t.router;

// Create a router with your API endpoints
const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name ?? 'world'}!`,
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
    get: publicProcedure.query(async ({ ctx }) => {
      const id = ctx.env.COUNTER.idFromName('global');
      const stub = ctx.env.COUNTER.get(id);
      const response = await stub.fetch('http://counter-do/');
      return response.json();
    }),
    increment: publicProcedure.mutation(async ({ ctx }) => {
      const id = ctx.env.COUNTER.idFromName('global');
      const stub = ctx.env.COUNTER.get(id);
      const response = await stub.fetch('http://counter-do/increment', { method: 'POST' });
      return response.json();
    }),
    decrement: publicProcedure.mutation(async ({ ctx }) => {
      const id = ctx.env.COUNTER.idFromName('global');
      const stub = ctx.env.COUNTER.get(id);
      const response = await stub.fetch('http://counter-do/decrement', { method: 'POST' });
      return response.json();
    }),
    reset: publicProcedure.mutation(async ({ ctx }) => {
      const id = ctx.env.COUNTER.idFromName('global');
      const stub = ctx.env.COUNTER.get(id);
      const response = await stub.fetch('http://counter-do/reset', { method: 'POST' });
      return response.json();
    }),
  }),
});

// Export type definition of API
export type AppRouter = typeof appRouter;

// Create context for tRPC
const createContext = (env: Env, req: Request) => ({
  env,
  req,
});

// Define context type for type safety
type Context = Awaited<ReturnType<typeof createContext>>;

// Handle incoming requests
export default {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle tRPC requests
    if (url.pathname.startsWith('/trpc')) {
      return fetchRequestHandler({
        endpoint: '/trpc',
        req: request,
        router: appRouter,
        createContext: () => createContext(env, request),
      });
    }

    // Handle direct DO access for testing - in production you might want to protect this
    if (url.pathname.startsWith('/counter')) {
      const counterPath = url.pathname.replace('/counter', '') || '/';
      const counterMethod = request.method;
      
      const id = env.COUNTER.idFromName('global');
      const stub = env.COUNTER.get(id);
      
      return stub.fetch(new URL(counterPath, 'http://counter-do'), {
        method: counterMethod,
        headers: request.headers,
        body: request.body,
      });
    }

    // Legacy API endpoint for backwards compatibility
    if (url.pathname.startsWith('/api/')) {
      return Promise.resolve(Response.json({
        name: 'Cloudflare',
      }));
    }

    return Promise.resolve(new Response(null, { status: 404 }));
  },
};

// Export the Durable Object class
export { CounterDO };
