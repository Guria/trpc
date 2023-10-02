/// <reference lib="webworker" />
import { applyWebWorkerHandler } from '@trpc/server/adapters/webworker';
import { appRouter } from './router';

declare const self: DedicatedWorkerGlobalScope;

const server = applyWebWorkerHandler({
  router: appRouter,
  worker: self,
});
