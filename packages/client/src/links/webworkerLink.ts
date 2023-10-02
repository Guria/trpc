import { AnyRouter } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { TRPCRequestMessage, TRPCResponseMessage } from '@trpc/server/rpc';
import { transformResult } from '../shared/transformResult';
import { TRPCClientError } from '../TRPCClientError';
import { TRPCLink } from './types';

interface WebWorkerLinkOptions {
  worker: Worker;
}

export function webworkerLink<TRouter extends AnyRouter>(
  opts: WebWorkerLinkOptions,
): TRPCLink<TRouter> {
  const { worker } = opts;

  return (runtime) =>
    ({ op }) =>
      observable((observer) => {
        const { path, id, type } = op;
        const input = runtime.transformer.serialize(op.input);

        const msg: TRPCRequestMessage = {
          id,
          jsonrpc: '2.0',
          method: type,
          params: {
            path,
            input,
          },
        };

        const onMessage = (event: MessageEvent<TRPCResponseMessage>) => {
          const response = event.data;
          if (response.id === msg.id) {
            const transformed = transformResult(response, runtime);

            if (!transformed.ok) {
              observer.error(TRPCClientError.from(transformed.error));
              return;
            }
            observer.next({
              result: transformed.result,
            });
            observer.complete();
          }
        };
        worker.addEventListener('message', onMessage);

        worker.postMessage(msg);

        return () => {
          worker.removeEventListener('message', onMessage);
        };
      });
}
