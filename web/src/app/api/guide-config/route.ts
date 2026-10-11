// Runtime settings for the /guide page. PUBLIC_GATEWAY_URL is read on every request (not inlined at
// build time), so pointing the guide at a new public gateway only needs the env var and a restart.

export const dynamic = "force-dynamic";

export function GET() {
  const raw = process.env.PUBLIC_GATEWAY_URL?.trim();
  const gatewayUrl = raw ? raw.replace(/\/+$/, "") : null;
  return Response.json({ gatewayUrl }, { headers: { "Cache-Control": "no-store" } });
}
