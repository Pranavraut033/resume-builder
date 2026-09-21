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
so a same-window popup can't work in the packaged desktop app. After you approve, the app raises its own
window and picks up the connection automatically, while the browser tab shows a "Signed in" page. After
3 seconds the page launches the app (`udaan://` — `udaan-canary://` for the canary build) and offers an
**Open Udaan** button as a fallback; some browsers block a custom-scheme launch that isn't a click, in
which case press the button or just close the tab. On the web build the button links to `/settings`.

## Where things live

- The Client ID/secret and OAuth tokens are stored **encrypted client-side** (`src/lib/keyStorage.ts` —
  AES-256-GCM on desktop, `localStorage` on web) — never in the SQLite database. See
  [`.claude/knowledge/data-layer.md`](../.claude/knowledge/data-layer.md) for the `EmailAccount`/`JobEmail`
  models.
- The one server-side piece is `src/app/api/auth/callback/google/route.ts`, the fixed redirect target
  Google requires. It does no token exchange and touches no secrets — it only hands the authorization code
  back to the client that started the flow, via a short-lived in-memory store
  (`src/lib/email/authCodeStore.ts`). See the documented exception to CLAUDE.md's hard rule 1.

## Sync limits and shared state

- **Max age: 28 days** (`MAX_EMAIL_AGE_DAYS`, `src/lib/email/syncWindow.ts`). Every Gmail pass — first connect,
  the alert backfill, and a long-idle install whose `lastSyncedAt` is months old — is floored at 28 days, so a
  sync can never fan out into hundreds of per-message classification/LLM calls. Older mail is ignored, not
  deleted: nothing already stored is removed.
- **One sync state for the whole app.** `useEmailSyncStore` (`src/store/emailSyncStore.ts`) holds `isSyncing`
  and `isConnecting`; `useEmailSync` only reads it, so Settings, `/emails`, `/opportunities` and the home
  table all agree. `runEmailSync` is the only writer: it sets the flag when a run starts and clears it in
  `finally` (a throw or reauth bail-out can't leave buttons stuck on "Syncing…"), and a caller arriving mid-run
  joins the in-flight promise instead of starting a second. The launch check and 12-hour timer run once, in
  `EmailSyncScheduler` (mounted in `layout.tsx`), not per component. A second Connect click while a sign-in is
  waiting is ignored.
- **Progress.** `useEmailSyncStore.progress` says where the run is — fetching `n/total`, classifying `n/total`,
  saving — and clears with `isSyncing`. `EmailSyncButton` (and the home table's button) show it as their label,
  and a manual run's "Syncing emails…" notification shows the same line, so background and manual runs look alike.
- **Email AI Model** is edited through the app's standard picker, `ModelSelector` with `scope="email"`
  (`src/components/ModelSelector.tsx`), used in Settings, `/emails` and `/opportunities`. Classification and posting
  extraction use it, falling back to the primary active model when unset.

## Job alerts → Opportunities

Each sync makes **two** Gmail passes: the application query, then `JOB_ALERT_QUERY` (LinkedIn / Indeed /
Glassdoor / StepStone / Xing / Jobware / ProDevs domains plus recommendation subjects such as "job alert",
"jobs for you", "new job request", "matches your profile", "neue jobs"; capped at 150). The sender and
subject lists live in one place, `src/lib/email/jobAlert.ts`, shared by the query, the classifier and the
conversion pass below. Sender rules are deliberately exact addresses, not bare platform domains — XING,
StepStone and LinkedIn (`jobs-noreply@`) also send _application_ mail — and a subject that is plainly about
an application ("your application…", "Bewerbung") is never an alert. They are separate on purpose — one OR'd query would let a burst of digests eat
the 250-message cap and starve application tracking. A failed alert pass never loses the application
emails.

The alert pass has **its own cursor**: it resumes from the newest stored digest, and backfills the full age window
when none exists yet. `lastSyncedAt` can't be used — it would skip every alert that arrived before this
feature. Digest bodies have their URLs shortened to the normalized form _before_ the length cap: LinkedIn
puts a ~700-char tracking URL on every posting, so otherwise the cap holds about one job.

Digests stored before `kind` existed sit as unlinked `APPLICATION` rows, which message-id dedupe would never
revisit. Each sync therefore runs `getMisfiledAlerts` → extract → `promoteStoredAlerts` to re-label them
`ALERT` and store their postings (rows the user linked to a job are left alone).

`classifyEmailHeuristically` checks `isJobAlert` first (before the stage keywords, since alert subjects
often say "interview"/"offer") and returns `kind: "ALERT"` at 0.7 confidence, so digests cost no LLM
classification call. `listingExtractor.ts` then splits each digest into postings — one LLM call per
digest, with a regex fallback when no email model is configured or the model returns nothing. Alert
bodies are kept to 12 000 chars (vs 4 000) so later postings in a long digest aren't cut off.

Alerts are stored as `JobEmail` rows with `kind: "ALERT"` and shown on `/opportunities`, not `/emails`.
They are never matched to a tracked job and never change a job's status. Postings dedupe on a normalized
URL — LinkedIn re-sends the same job with a new `trackingId` every time. **Save** runs the same
fetch → parse → `BOOKMARKED` job path as `/bookmarks`.

## Troubleshooting

- **"Access blocked: this app's request is invalid"** — the redirect URI in the request doesn't match one
  registered on the client. Confirm you added both ports, and that they're on a **Web application** client,
  not a Desktop one.
- **"invalid_client"** — no client ID configured, or it doesn't match the project the redirect URI belongs
  to.
- **Reconnect prompt after it worked once** — Google revoked or expired the refresh token (e.g. you removed
  app access in your Google Account settings). Reconnect from Settings.
