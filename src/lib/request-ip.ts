// Client IP extraction — safe for server-side only.
// Prefers Cloudflare (cf-connecting-ip) then standard proxy headers.

export function getRequestIP(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
