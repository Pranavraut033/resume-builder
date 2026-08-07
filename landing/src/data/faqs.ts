// Single source for both the homepage FAQ preview and /faq. Questions are
// things actually true of this repo, not generic SaaS-FAQ filler.
export const faqs: [string, string][] = [
  [
    "Does the API key actually cost anything?",
    "A few cents per resume with most providers, paid directly to them at their rates. Or skip keys entirely and run a local Ollama model for free.",
  ],
  [
    "Can it run fully offline?",
    "Yes. Point it at a local Ollama model and every AI call happens on your machine, with no network request and no account.",
  ],
  [
    "Does my data ever leave my machine?",
    "Only the text you send to whichever AI provider you chose, the same as pasting into ChatGPT. Your profile, jobs, and resumes live in a local SQLite database that Udaan never uploads.",
  ],
  [
    "Will an ATS actually parse the exported PDF?",
    "Yes. The PDF export uses standard text layout instead of images or exotic fonts, which is what most ATS parsers choke on.",
  ],
  [
    "Will it write things I didn't actually do?",
    "It rewrites your base profile rather than inventing one. Every AI edit is a suggested change you review before it's applied, so nothing exports without you seeing it first.",
  ],
  [
    "Why does my OS show a scary warning on first launch?",
    "Udaan is self-signed rather than paid-publisher signed, so macOS and Windows show a one-time warning for any app outside their stores. See the note below the download button for the two-click fix.",
  ],
  [
    "Why is the download 118MB if it's not Electron?",
    "Tauri keeps the app binary itself small, but Udaan bundles a full Next.js server to run its local API and database layer, and that server is most of the size. It's still a native window rather than a wrapped browser tab, so startup and memory use stay closer to Tauri than Electron.",
  ],
  [
    "Is Windows and Linux support actually coming, or is that just marketing?",
    "Today's builds are macOS only. Every release so far has shipped a universal .dmg. The Tauri config already targets Windows and Linux, so it's a build and test pass away rather than a rewrite, but there's no fixed date yet.",
  ],
  [
    "Where exactly are my API keys stored?",
    "On desktop, in a file encrypted with AES-256-GCM, where the encryption key comes from a per-install master key held in your OS keychain. On the web build, they sit in localStorage. Either way, they never touch Udaan's SQLite database or leave your machine.",
  ],
  [
    "Can I move my data to another machine?",
    "Settings has a Backup & Restore page that exports your full database as JSON. It deliberately excludes your API keys, so restoring on a new machine still asks you to re-enter those.",
  ],
  [
    "What happens to my data when I update the app?",
    "An update replaces the app bundle but never touches your existing database. On launch, a migration step alters your database in place to match the new schema, so it's a no-op once you're already current.",
  ],
  [
    "Does it support European CV conventions, like a photo?",
    "Yes. Your profile has dedicated fields for a photo and a hobbies section, both optional, matching the format expected on a German or broader EU-style CV.",
  ],
  [
    "Can I use it without AI at all?",
    "You can write and edit a resume by hand start to finish, with PDF/TXT export, templates, and the deterministic proofread checks all working with no model configured. AI-specific features like tailoring and the chat assistant need a provider, but they're optional.",
  ],
  [
    "What does the MCP server actually let Claude Desktop do?",
    "It exposes Udaan's own flows as tools Claude can call directly: parsing a job description, listing your jobs and profiles, generating and editing a tailored resume, and exporting files. Claude runs the conversation on the subscription you already pay for; Udaan only reads and writes your local database.",
  ],
  [
    "Does Udaan phone home?",
    "The app itself has no telemetry. This marketing site runs a privacy-focused analytics beacon (page views and Core Web Vitals, no cookies, no personal data), but the desktop app you actually use does not.",
  ],
];
