import { NextResponse } from "next/server";
import { grantHeartsWithServiceRole, grantHeartsWithUserJwt } from "@/lib/checkout/grant-hearts";
import { getStripe, isStripeCheckoutReady } from "@/lib/stripe";
import { getUserFromBearer } from "@/lib/supabase/auth-from-request";

type Body = {
  sessionId?: unknown;
};

export async function POST(request: Request) {
  if (!isStripeCheckoutReady()) {
    return NextResponse.json(
      { error: "Stripe heart purchases are not configured on the server." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const { user, accessToken } = await getUserFromBearer(request);
  if (!user?.id || !accessToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return NextResponse.json(
      { ok: false, error: "Payment not completed yet." },
      { status: 400 },
    );
  }

  const metaUser = session.metadata?.userId ?? session.client_reference_id;
  if (metaUser !== user.id) {
    return NextResponse.json({ error: "Session does not belong to this account." }, { status: 403 });
  }

  const okJwt = await grantHeartsWithUserJwt(accessToken, user.id);
  if (okJwt) {
    return NextResponse.json({ ok: true });
  }

  const okAdmin = await grantHeartsWithServiceRole(user.id);
  if (okAdmin) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Could not update hearts. Check Supabase RLS or set SUPABASE_SERVICE_ROLE_KEY." },
    { status: 500 },
  );
}
