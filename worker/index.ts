import { initTRPC } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { z } from 'zod';

const t = initTRPC.create();
const publicProcedure = t.procedure;
const router = t.router;

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
});

// Export type definition of API
export type AppRouter = typeof appRouter;

// Handle incoming requests
export default {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle tRPC requests
    if (url.pathname.startsWith('/trpc')) {
      return fetchRequestHandler({
        endpoint: '/trpc',
        req: request,
        router: appRouter,
        createContext: () => ({}),
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
} satisfies ExportedHandler<Env>;
