# LLM Gateway

Managed, paid LLM access for Udaan users who don't want to bring
their own API key. Prepaid credits via Stripe → a personal LiteLLM virtual
key → pasted into the app exactly like a BYOK key.

- **LiteLLM Proxy** — OpenAI-compatible API, per-key budgets, spend tracking.
  Profit comes from the markup baked into `litellm-config.yaml`'s per-token
  pricing (upstream cost × `MARKUP_MULTIPLIER`).
- **webhook-handler** — the only custom code. One Stripe webhook that creates
  or tops up a virtual key, keyed by the buyer's email. No database of its
  own — state lives in Stripe customer metadata + LiteLLM's own tables.

## Local dev

```bash
cp .env.example .env   # fill in LITELLM_MASTER_KEY, upstream provider keys, Stripe test keys
docker compose up
```

Forward Stripe webhooks to the local handler:

```bash
stripe listen --forward-to localhost:3009/webhook/stripe
# paste the printed whsec_... into .env as STRIPE_WEBHOOK_SECRET, then restart docker compose
```

Sanity check LiteLLM is up:

```bash
curl localhost:4000/v1/models -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## Stripe setup (one-time, per environment)

1. Create Payment Links for each credit pack (e.g. $5 / $10 / $20). Enable
   "Collect customer email" — the whole no-account design keys off the
   buyer's email.
2. Set each link's after-payment redirect to:
   `https://<gateway-domain>/success?session_id={CHECKOUT_SESSION_ID}`
3. Add a webhook endpoint pointing at `https://<gateway-domain>/webhook/stripe`
   subscribed to `checkout.session.completed`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`.

## Deploying

Any Docker host works (Railway, Fly.io, a VPS) — `docker compose up` as-is,
with a real `.env` and a domain/TLS in front of the `webhook-handler` (3009)
and `litellm` (4000) ports. Point the app's
`NEXT_PUBLIC_LLM_GATEWAY_URL` at `https://<gateway-domain>` (LiteLLM serves
`/v1/...`) and `NEXT_PUBLIC_STRIPE_PAYMENT_URL` at the Payment Link.

## Verifying budget enforcement

```bash
curl -X POST localhost:4000/key/update \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "sk-...", "max_budget": 0.001}'
```

Then generate something in the app with that key — it should fail once spend
exceeds the budget, without affecting BYOK providers.
