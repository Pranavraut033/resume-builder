# Using Udaan for free

Udaan doesn't sell you AI credits. You bring your own AI, and it runs on your machine. That means there are
several ways to use the whole app without paying anyone anything — including without a credit card.

Five options, easiest first:

| Option                     | Cost     | Needs a card? | Good for                                                 |
| -------------------------- | -------- | ------------- | -------------------------------------------------------- |
| **Google Gemini**          | Free     | No            | Most people — the most generous free tier, ~1,000/day    |
| **OpenRouter free models** | Free     | No            | More model choice, but only ~50 requests/day             |
| **Ollama (fully local)**   | Free     | No account    | Privacy, offline, unlimited use, decent hardware         |
| **MCP via your chat app**  | Free-ish | No            | You already pay for Claude or another chat assistant     |
| **Custom endpoint**        | Varies   | No            | NVIDIA NIM, Qwen, Cloudflare AI, or anything self-hosted |

> **Privacy note up front:** on Google's and OpenRouter's free tiers, your data may be used to improve their
> models. Your resume contains your name, address, phone number and full work history. If that bothers you,
> use **Ollama** (Option C) — it never leaves your machine — or pay for a tier that excludes training. Udaan
> itself never sends your data anywhere except to the provider you chose.

---

## Option A: Google Gemini (most generous free tier)

Google's AI Studio gives out an API key with no credit card and no expiry date. It's the only major provider
with an indefinite free API tier, and its daily allowance is far higher than everyone else's.

### Steps

1. Go to [aistudio.google.com](https://aistudio.google.com) and sign in with a Google account.
2. Click **Get API key** → create a key in a new project. Copy it. (No billing setup, no card.)
3. In Udaan, open **Settings** → find **Google Gemini** → paste the key → save.
4. Pick a **Flash** or **Flash-Lite** model from the dropdown.

### What you get

- Roughly **5–15 requests per minute** and **up to 1,000 requests per day**.
- **Flash and Flash-Lite models only.** Google removed Pro models from the free tier in April 2026 — if you
  see a Pro model in the dropdown and it errors, that's why. Flash is more than good enough for resume work.
- 1,000/day is a lot: tailoring one application takes a handful of requests, so this realistically covers
  a hundred-plus applications a day. You will not hit this.

**Trade-off:** free-tier data may be used to improve Google's products. Paid tiers exclude this; the free tier
doesn't. See the privacy note above.

---

## Option B: OpenRouter free models

OpenRouter is a single API that routes to many AI providers. Some models on it cost nothing, and you don't
need to enter a payment method to use them.

### Steps

1. Go to [openrouter.ai](https://openrouter.ai) and sign up (Google/GitHub sign-in works — no card).
2. Go to [openrouter.ai/keys](https://openrouter.ai/keys) and create a new API key. Copy it.
3. In Udaan, open **Settings** → find **OpenRouter** → paste the key → save.
4. Open the model dropdown. Udaan pulls OpenRouter's live catalog, so you'll see everything available to you.
   **Pick any model whose name ends in `:free`.**

That's it. No billing page, no card.

### Which free model?

The free lineup changes constantly — providers add, pull, and reprice models every few weeks — so rather than
trusting a list in a doc, filter for yourself:

- Browse [openrouter.ai/models](https://openrouter.ai/models) and use the **Free** price filter, or
- Just scroll the model dropdown in Udaan's Settings and look for the `:free` suffix.

What actually matters for resume work: **a large context window** (your resume plus a full job description
plus instructions adds up) and solid instruction-following. Anything advertising 100K+ context is comfortable.
Models with a million-token context show up in the free tier regularly.

If a model starts erroring or vanishes from the dropdown, it was probably pulled — pick another `:free` one.
Nothing in your saved data is tied to the model you chose.

### The limits (read this before you plan your day)

Straight from [OpenRouter's rate-limit docs](https://openrouter.ai/docs/api-reference/limits):

- **20 requests per minute**
- **50 requests per day** on free models, if you've never bought credits
- **1,000 requests per day** if you've ever purchased at least $10 in credits

Is 50/day enough? For most job seekers, yes. Tailoring one application uses a handful of requests (parse the
job posting, tailor the resume, generate the cover letter, run a fit check), so 50/day works out to roughly
five to ten full applications in a day. That's a heavy application day for most people.

**One gotcha worth knowing:** if your OpenRouter account balance ever goes _negative_, you'll get `402` errors
**even on free models**. If free models suddenly stop working, check your balance first — bringing it back to
zero or above fixes it.

---

## Option C: Ollama (completely local, no account, no limits)

Ollama runs an AI model directly on your own computer. No API key, no account, no rate limits, and nothing
you write ever leaves your machine.

### Steps

1. Install [Ollama](https://ollama.com) for your OS.
2. Pull a model from a terminal — for example:
   ```bash
   ollama pull llama3.1:8b
   ```
3. In Udaan, open **Settings** → choose **Ollama**. No key needed; it talks to Ollama on your machine.

### Trade-offs

- **Pro:** unlimited, private, works offline, genuinely free forever.
- **Con:** you need the hardware. An 8B model wants roughly 8 GB of free RAM; larger models want much more. On
  a modest laptop it will be noticeably slower than a hosted model, and smaller local models write weaker
  resume prose than the big hosted ones.

Worth trying if you're privacy-conscious or you've blown through a daily cap. If your machine struggles, go
back to Option A.

---

## Option D: Use the chat subscription you already pay for (MCP)

If you already pay for Claude (or another MCP-capable chat app), you don't need an AI key in Udaan at all.
Udaan ships an optional MCP server that lets your chat assistant drive the same flows — parsing jobs,
tailoring, fit checks, editing your profile with a diff preview before anything saves — while the thinking
happens on your existing subscription.

Turn it on in **Settings** (it's off by default) and download the connector. Full setup: [docs/MCP.md](./MCP.md).

This is the best option if you're already paying for a chat assistant, since you're not adding a second bill.

---

## Option E: Any other provider, via a custom endpoint

Most AI providers speak the same API shape as OpenAI. Udaan has a **Custom (OpenAI-compatible)** provider
slot: give it a base URL and a key, and it works like any built-in one — including populating the model
dropdown from whatever that endpoint actually offers.

This unlocks the free tiers that aren't built in. Set it up in **Settings** → **Add provider** →
**Custom (OpenAI-compatible)**.

### Base URLs that work

| Provider                  | Base URL                                                           | Free tier                                   |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| **NVIDIA NIM**            | `https://integrate.api.nvidia.com/v1`                              | Free, no card (phone verification), ~40/min |
| **Qwen** (international)  | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`           | Free trial quota per model                  |
| **Cloudflare Workers AI** | `https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/ai/v1` | 10,000 neurons/day free                     |
| **Self-hosted**           | e.g. `http://localhost:8000/v1`                                    | Free — it's your own machine                |

**NVIDIA NIM is the pick of these.** Sign up at [build.nvidia.com](https://build.nvidia.com) for a free
developer account, and you get a key covering a large catalog of current models at roughly 40 requests per
minute — a higher rate than Gemini's free tier, though NVIDIA describes it as being for evaluation rather than
production use.

For **Cloudflare**, replace `<ACCOUNT_ID>` with your own account ID from the Cloudflare dashboard (it isn't a
secret). For **Qwen**, use the `dashscope-intl` host above unless you're in mainland China, where it's
`dashscope.aliyuncs.com` instead.

### Two things to know

- **The URL must be `https://`** — your API key and your resume are both sent to whatever address you enter,
  so Udaan refuses plain `http://` for anything except `localhost`, where there's no network to intercept.
- **It usually ends in `/v1`.** If the model dropdown stays empty after saving, a missing or doubled `/v1` is
  the most common cause. Check the provider's own "OpenAI compatibility" docs page for the exact string.

One endpoint at a time: configuring a second one replaces the first. If you want several side by side,
[open an issue](https://github.com/Pranavraut033/resume-builder/issues) and say so.

---

## Which should you pick?

- **Just want it working, no card, plenty of headroom:** Option A (Gemini). Start here.
- **Want to try lots of different models:** Option B (OpenRouter) — but mind the 50/day cap.
- **Care most about privacy, or want unlimited use:** Option C (Ollama).
- **Already pay for Claude or similar:** Option D (MCP).
- **Want a provider that isn't in the list:** Option E (custom endpoint) — NVIDIA NIM, Qwen, Cloudflare.

You can set up more than one and switch per job from the provider selector — there's no lock-in, and your
resumes and job data live in a local database on your machine regardless of which one you use.

**Also free, also built in:** Groq has a no-card free tier and is worth a look if you want speed — it's in the
provider list already. Check your exact limits on
[Groq's limits page](https://console.groq.com/settings/limits) once you've signed up, since they vary by
account.

---

## Troubleshooting

| Symptom                               | Fix                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `402` error on a free model           | Your OpenRouter balance is negative. Bring it to zero or above.              |
| `429` / rate-limited                  | You've hit a per-minute or per-day cap. Wait, or switch providers.           |
| A Gemini Pro model errors             | Pro models left the free tier in April 2026. Pick a Flash or Flash-Lite.     |
| A model disappeared from the dropdown | It was pulled from the free tier. Pick another `:free` model.                |
| Ollama option does nothing            | Ollama isn't running. Start it and confirm you've pulled at least one model. |
| Key saved but nothing generates       | Re-check the key was pasted whole — keys are long and easy to truncate.      |
| Custom endpoint saves, no models      | The base URL is wrong — usually a missing or doubled `/v1`.                  |
| Custom endpoint rejects your URL      | It must be `https://` (or `localhost`). See Option E.                        |

Your API keys are encrypted on disk on desktop (keyed off your OS keychain) and never sent to any server of
ours — there is no server of ours. See the [README](../README.md) for the details.

---

_Last verified 2026-09-09. Free tiers change often — if something here doesn't match what you see, trust the
providers' own pages over this one: [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits),
[OpenRouter models](https://openrouter.ai/models),
[OpenRouter rate limits](https://openrouter.ai/docs/api-reference/limits),
[NVIDIA build.nvidia.com](https://build.nvidia.com),
[Alibaba Model Studio OpenAI compatibility](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope).
Please [open an issue](https://github.com/Pranavraut033/resume-builder/issues) if you spot a stale number._
