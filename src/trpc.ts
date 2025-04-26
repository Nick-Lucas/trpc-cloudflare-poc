import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../trpc';

// Export the tRPC client
export const trpc = createTRPCReact<AppRouter>();
