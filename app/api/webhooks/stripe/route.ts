import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { grantHeartsWithServiceRole } from "@/lib/checkout/grant-hearts";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const kind = session.metadata?.kind;
  if (kind && kind !== "heart_refill") {
    return;
  }
  const userId = session.metadata?.userId ?? session.client_reference_id;
  if (!userId || typeof userId !== "string") {
    return;
  }
  const ok = await grantHeartsWithServiceRole(userId);
  if (!ok) {
    console.error(
      "[stripe webhook] Failed to grant hearts — set SUPABASE_SERVICE_ROLE_KEY or fix RLS.",
    );
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Webhook signature: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutComplete(session);
  }

  return NextResponse.json({ received: true });
}
