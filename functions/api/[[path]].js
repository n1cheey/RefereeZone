import { handler as apiHandler } from './_handler.mjs';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

const ensureProcessEnv = (env) => {
  const processLike = globalThis.process ?? { env: {} };
  processLike.env ||= {};

  Object.entries(env || {}).forEach(([key, value]) => {
    if (typeof value === 'string' && processLike.env[key] === undefined) {
      processLike.env[key] = value;
    }
  });

  globalThis.process = processLike;
};

const toPlatformEvent = async (request) => {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers.entries());
  const event = {
    httpMethod: request.method,
    path: url.pathname,
    rawUrl: request.url,
    headers,
    multiValueHeaders: Object.fromEntries(
      Array.from(request.headers.entries()).map(([key, value]) => [key, [value]]),
    ),
    body: null,
    isBase64Encoded: false,
  };

  if (METHODS_WITH_BODY.has(request.method.toUpperCase())) {
    event.body = await request.text();
  }

  return event;
};

export async function onRequest(context) {
  ensureProcessEnv(context.env);

  const event = await toPlatformEvent(context.request);
  const response = await apiHandler(event);

  return new Response(response.body, {
    status: response.statusCode,
    headers: response.headers,
  });
}
