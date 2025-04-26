import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../worker';

// Export the tRPC client
export const trpc = createTRPCReact<AppRouter>();
