import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { webworkerLink } from '@trpc/client';
import { useState } from 'react';
import { Greeting } from './Greeting';
import { trpc } from './trpc';
import Worker from './worker?worker';

const worker = new Worker();

export function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [webworkerLink({ worker })],
    }),
  );
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Greeting />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
