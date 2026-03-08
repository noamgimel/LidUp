Deno.serve(async (_req) => {
  const serverNowMs = Date.now();
  return Response.json({
    ok: true,
    serverNowIso: new Date(serverNowMs).toISOString(),
    serverNowMs,
  });
});