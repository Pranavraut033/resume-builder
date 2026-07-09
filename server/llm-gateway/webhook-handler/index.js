import { serve } from "@hono/node-server";
import { Hono } from "hono";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const LITELLM_API_URL = process.env.LITELLM_API_URL;
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY;

const app = new Hono();

async function litellmFetch(path, options) {
  const res = await fetch(`${LITELLM_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${LITELLM_MASTER_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`LiteLLM ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function findCustomerByEmail(email) {
  const { data } = await stripe.customers.list({ email, limit: 1 });
  return data[0] ?? null;
}

// Creates a virtual key on first purchase, or tops up the existing key's
// budget by `amountUsd` on repeat purchases. State lives entirely in Stripe
// customer metadata + LiteLLM's own key/spend tables — no local database.
async function grantOrTopUp(email, amountUsd) {
  let customer = await findCustomerByEmail(email);
  const existingKey = customer?.metadata?.litellm_key;

  if (!existingKey) {
    const generated = await litellmFetch("/key/generate", {
      method: "POST",
      body: JSON.stringify({
        max_budget: amountUsd,
        metadata: { email },
      }),
    });

    if (!customer) {
      customer = await stripe.customers.create({
        email,
        metadata: { litellm_key: generated.key },
      });
    } else {
      await stripe.customers.update(customer.id, {
        metadata: { litellm_key: generated.key },
      });
    }
    return generated.key;
  }

  const { info } = await litellmFetch(
    `/key/info?key=${encodeURIComponent(existingKey)}`,
    { method: "GET" }
  );
  const newBudget = (info?.max_budget ?? 0) + amountUsd;
  await litellmFetch("/key/update", {
    method: "POST",
    body: JSON.stringify({ key: existingKey, max_budget: newBudget }),
  });
  return existingKey;
}

app.post("/webhook/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  const body = await c.req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return c.json({ error: `Invalid signature: ${err.message}` }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email ?? session.customer_email;
    const amountUsd = session.amount_total / 100;

    if (!email) {
      return c.json({ error: "No email on checkout session" }, 400);
    }

    try {
      await grantOrTopUp(email, amountUsd);
    } catch (err) {
      console.error("Failed to grant/top-up key", err);
      return c.json({ error: err.message }, 500);
    }
  }

  return c.json({ received: true });
});

// Stripe redirects the buyer here after checkout. Re-derives the key from
// the same Stripe customer record the webhook just wrote to, rather than
// needing its own session->key store.
app.get("/success", async (c) => {
  const sessionId = c.req.query("session_id");
  if (!sessionId) return c.text("Missing session_id", 400);

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const email = session.customer_details?.email ?? session.customer_email;
  const customer = email ? await findCustomerByEmail(email) : null;
  const key = customer?.metadata?.litellm_key;

  if (!key) {
    return c.html(
      "<p>Payment received, but your key isn't ready yet. Refresh in a few seconds, or contact support.</p>"
    );
  }

  return c.html(`
    <!doctype html>
    <html>
      <body style="font-family: sans-serif; max-width: 480px; margin: 40px auto;">
        <h2>Your Resume Builder Cloud key</h2>
        <p>Paste this into the app's Settings &rarr; Resume Builder Cloud &rarr; API key field.</p>
        <code style="display:block; padding:12px; background:#f4f4f4; border-radius:8px; word-break:break-all;">${key}</code>
        <p style="color:#666; font-size:14px;">Keep this key private — anyone with it can spend your credits.</p>
      </body>
    </html>
  `);
});

// ponytail: no email delivery for lost keys yet — buyer re-visits /success
// with their original session_id, or contacts support. Add Resend/SendGrid
// here if lost-key volume becomes a real support burden.
app.get("/key/retrieve", async (c) => {
  return c.json(
    { error: "Not implemented — contact support with your purchase email" },
    501
  );
});

const port = Number(process.env.PORT) || 3009;
serve({ fetch: app.fetch, port });
console.log(`webhook-handler listening on :${port}`);
