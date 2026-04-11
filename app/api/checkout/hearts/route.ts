import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";
import { getStripe, isStripeCheckoutReady } from "@/lib/stripe";
import { getUserFromBearer } from "@/lib/supabase/auth-from-request";

/**
 * POST /api/checkout/hearts
 * Starts Stripe Checkout for a full heart refill (one-time payment).
 */
export async function POST(request: Request) {
  if (!isStripeCheckoutReady()) {
    return NextResponse.json(
      { error: "Stripe heart purchases are not configured on the server." },
      { status: 503 },
    );
  }

  const { user } = await getUserFromBearer(request);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID_HEART_REFILL!.trim();
  const site = getSiteUrl(request);

  try {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        kind: "heart_refill",
      },
      success_url: `${site}/dashboard/play?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/dashboard/play?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not create checkout session." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe Checkout failed.";
    return NextResponse.json(
      {
        error: message.includes("recurring")
          ? "This Price is a subscription. Create a one-time Price in Stripe and set STRIPE_PRICE_ID_HEART_REFILL to that price_ id."
          : message,
      },
      { status: 400 },
    );
  }
}
