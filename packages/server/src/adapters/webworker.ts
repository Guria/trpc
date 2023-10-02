/// <reference lib="webworker" />
import { AnyRouter, callProcedure, ProcedureType } from '../core';
import { getTRPCErrorFromUnknown } from '../error/TRPCError';
import { parseMessage, TRPCClientOutgoingMessage } from '../rpc';
import { getErrorShape } from '../shared/getErrorShape';

export type WebWorkerHandlerOptions<TRouter extends AnyRouter> = {
  router: TRouter;
  worker: DedicatedWorkerGlobalScope;
};

export function applyWebWorkerHandler<TRouter extends AnyRouter>(
  opts: WebWorkerHandlerOptions<TRouter>,
) {
  const { router, worker } = opts;
  const { transformer } = router._def._config;

  async function handleRequest(msg: TRPCClientOutgoingMessage) {
    if (msg.method === 'subscription.stop') {
      // nothing prevents us to implement subscriptions here,
      // but I can't see a use case for it now
      return;
    }

    const { id, method, params, jsonrpc } = msg;
    const { path, input } = params;
    const type = method as ProcedureType;

    try {
      const result = await callProcedure({
        procedures: router._def.procedures,
        path,
        rawInput: input,
        ctx: undefined,
        type,
      });

      worker.postMessage({
        id,
        jsonrpc,
        result: {
          type: 'data',
          data: transformer.output.serialize(result),
        },
      });
    } catch (cause) {
      const error = getTRPCErrorFromUnknown(cause);
      worker.postMessage({
        id,
        jsonrpc,
        error: getErrorShape({
          config: router._def._config,
          error,
          type,
          path,
          input,
          ctx: undefined,
        }),
      });
    }
  }

  worker.addEventListener('message', async (event) => {
    try {
      await handleRequest(parseMessage(event.data, transformer));
    } catch (cause) {
      const error = getTRPCErrorFromUnknown(cause);
      worker.postMessage({
        id: null,
        jsonrpc: '2.0',
        error: getErrorShape({
          config: router._def._config,
          error,
          type: 'unknown',
          path: undefined,
          input: undefined,
          ctx: undefined,
        }),
      });
    }
  });
}
