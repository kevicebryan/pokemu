/** Base URL for Stripe redirects and absolute links. */
export function getSiteUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) {
    return env.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return host.replace(/\/$/, "");
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
