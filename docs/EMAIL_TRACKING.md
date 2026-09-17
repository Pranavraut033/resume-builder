# Email Job Tracking — Google OAuth Setup

The email tracker connects a Gmail account read-only, fetches recruiting-related emails, classifies
them, and links them to your tracked jobs.

A build can bake in a default Google OAuth client via `NEXT_PUBLIC_GOOGLE_CLIENT_ID`/
`NEXT_PUBLIC_GOOGLE_CLIENT_SECRET` (`src/lib/email/gmailClient.ts`'s `DEFAULT_GOOGLE_CLIENT_ID`/
`hasDefaultGoogleClient()`), letting most users click **Connect Gmail** with no setup — Settings'
**Google OAuth Client** panel then becomes an optional override instead of a required field. These vars
aren't currently wired into `.env.example` or a release workflow, so a self-built instance has none by
default and needs the steps below. If you're provisioning your own client (self-built, or to override a
bundled one), it's free and takes a few minutes.

## 1. Create a Google Cloud project

Go to [console.cloud.google.com](https://console.cloud.google.com), create a new project (or reuse one),
then **APIs & Services → Library** and enable the **Gmail API**.

## 2. Configure the OAuth consent screen

**APIs & Services → OAuth consent screen**:

- User type: **External**
- Publishing status: **Testing** (leave it in Testing — see below)
- Under **Test users**, add your own Google account's email address

`gmail.readonly` is a Google _restricted_ scope. In **Testing** mode it works for up to 100 test users
with no review. Publishing to **Production** requires Google's security assessment for restricted
scopes — unnecessary for a single-user local app; stay in Testing.

## 3. Create OAuth credentials

**APIs & Services → Credentials → Create Credentials → OAuth client ID**.

- Application type: **Web application** (not "Desktop app" — only the Web type accepts explicit
  `http://localhost` redirect URIs, which this flow needs)
- Under **Authorized redirect URIs**, add **both**, so it works in dev and in the packaged app:
  - `http://localhost:3008/api/auth/callback/google`
  - `http://localhost:3009/api/auth/callback/google`
- Add scope `.../auth/gmail.readonly` and `.../auth/userinfo.email` if prompted

Save. You'll get a **Client ID** and a **Client secret** — Google requires the secret at token exchange
even with PKCE enabled, which this app uses.

## 4. Add the credentials in-app

Settings → **Email & Job Application Tracking** → **Google OAuth Client** → paste the Client ID and
Client secret → **Save Google OAuth Client**. The exact redirect URI to register (matching whichever port
you're running on) is shown in the same panel.

Then click **Connect Gmail**. This opens the consent screen in your **system browser**, not inside the
app window — Google blocks OAuth sign-in inside embedded webviews (Tauri's WKWebView/WebView2 included),
so a same-window popup can't work in the packaged desktop app. After you approve, the browser tab shows a
"you can close this window" page and the app picks up the connection automatically.

## Where things live

- The Client ID/secret and OAuth tokens are stored **encrypted client-side** (`src/lib/keyStorage.ts` —
  AES-256-GCM on desktop, `localStorage` on web) — never in the SQLite database. See
  [`.claude/knowledge/data-layer.md`](../.claude/knowledge/data-layer.md) for the `EmailAccount`/`JobEmail`
  models.
- The one server-side piece is `src/app/api/auth/callback/google/route.ts`, the fixed redirect target
  Google requires. It does no token exchange and touches no secrets — it only hands the authorization code
  back to the client that started the flow, via a short-lived in-memory store
  (`src/lib/email/authCodeStore.ts`). See the documented exception to CLAUDE.md's hard rule 1.

## Troubleshooting

- **"Access blocked: this app's request is invalid"** — the redirect URI in the request doesn't match one
  registered on the client. Confirm you added both ports, and that they're on a **Web application** client,
  not a Desktop one.
- **"invalid_client"** — no client ID configured, or it doesn't match the project the redirect URI belongs
  to.
- **Reconnect prompt after it worked once** — Google revoked or expired the refresh token (e.g. you removed
  app access in your Google Account settings). Reconnect from Settings.
