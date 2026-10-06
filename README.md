# Virtual Style Studio

**"Try It. Style It. Love It."** — see how an outfit will look on you before you buy it.

A mobile-first full-stack web app: pick who you're styling (man / woman / boy / girl),
bring your model to life (upload a photo, generate AI people, or build a parametric avatar),
then mix tops, bottoms, dresses, shoes and accessories with rich colors, patterns,
materials and fits — and preview the look instantly.

## ✨ What works today (Phase 1 MVP)

- **Landing page** — headline, 4 entry CTAs, example-looks gallery, privacy note
- **Person-type flow** — Man / Woman / Boy / Girl cards drive categories, filters and safety rules
- **3 model sources**
  - *Upload My Photo* — JPG/PNG/WebP (+ camera on mobile), canvas crop/zoom, privacy notice, owner-only delete
  - *Choose an AI Person* — filterable (age group, skin tone, hair, body type — neutral labels only), generates 8 at a time, "Generate More People"
  - *Create Avatar* — parametric SVG avatar: 12 skin tones + undertones, face/hair/body/age controls, front/side/¾ poses, **identity stays byte-identical when clothing changes**, Save / Reset / Edit
- **Try-on studio** — sticky model preview; Tops / Bottoms / Dresses / Outerwear / Shoes / Accessories tabs; named color palette (8 groups) + custom picker + color-style modifiers (pastel, neon, jewel…); patterns, materials, fits, sizes
- **AI try-on** — avatars render instantly on-device; photo models go through an async job ("Creating your look…") with a Before/After slider
- **AI Outfit Generator** — occasion / weather / style / color / budget → complete suggested outfit
- **Style presets, Saved Looks** (compare up to 4 side-by-side, reuse/duplicate/delete), **color matching** ("what goes with navy?")
- **Accounts** — email/password + guest mode; Google/Apple shown as honest "coming soon"
- **Privacy & safety** — private uploads, delete-my-data, no training use, kid-safe catalog filtering, non-sexualized generation guardrails

### Honest limitations (labeled in the product)

- Photo try-on uses **prompt-based image editing** (Pollinations, free/keyless). It produces a realistic *AI preview* — not a true garment-warping virtual try-on. Faces can shift slightly between generations; the avatar path is the pixel-consistent option.
- `AI_PROVIDER=mock` returns clearly watermarked "Preview" placeholders for offline dev.
- True try-on models (IDM-VTON, etc.) plug in via the provider interface — see below.

## 🏗 Architecture

```
virtual-style-studio/
├── packages/shared/      # @vss/shared — types, clothing catalog (70 items), color system
├── server/               # @vss/server — Express + TS + Prisma + PostgreSQL
│   ├── src/ai/           # AIProvider interface: pollinations | mock | gemini* | replicate*
│   ├── src/jobs/         # JobQueue interface + InMemoryJobQueue (retries, backoff)
│   ├── src/routes/       # /api/* — auth, uploads, ai, tryon, catalog, outfits, colors, avatars, looks
│   └── prisma/           # schema + migrations
├── client/               # @vss/client — React 18 + TS + Vite + Tailwind + react-router
│   ├── src/avatar/       # parametric SVG avatar renderer (31 garments, 3 poses)
│   └── src/routes/       # /, /start, /create, /studio, /styles, /generator, /looks, /profile, /privacy
├── Dockerfile            # multi-stage: build all → run node serving client/dist
└── render.yaml           # Render Blueprint: web (docker, free) + postgres (free)
```

**AI pipeline (photo try-on):** upload → job enqueue → provider builds a safety-constrained
prompt (fully-clothed, modest, neutral descriptors) → image edit → result URL → client
Before/After slider. All AI work is async: `POST` returns `{jobId}`, `GET /api/ai/jobs/:id`
polls `{status, progress, result?, error?}`. Swap `InMemoryJobQueue` for BullMQ/Redis via
the `JobQueue` interface — no route changes needed.

**API docs:** [`server/API.md`](server/API.md) — every endpoint, env vars, error envelope,
and the avatar client-render decision.

## 🚀 Quickstart (local)

Prerequisites: Node 20+, Docker (for Postgres).

```bash
# 1. Database
docker compose up -d db            # postgres:16 on :5432 (user/pass vss)

# 2. Install + generate Prisma client
npm install
npx prisma generate --schema server/prisma/schema.prisma

# 3. Migrate + env
cp .env.example .env                # defaults work for local dev
npx prisma migrate dev --schema server/prisma/schema.prisma

# 4. Run (two terminals, or one:)
npm run dev                         # server :4000 + client :5173 (proxies /api)
```

Open http://localhost:5173. Try `AI_PROVIDER=mock` in `.env` for fully offline dev.

### Scripts (repo root)

| Command | What it does |
|---|---|
| `npm run dev` | server + client in watch mode |
| `npm run build` | shared → server → client (tsc + vite) |
| `npm test` | vitest suites for all three workspaces (128 tests, offline-safe) |
| `npm run typecheck` | `tsc --noEmit` everywhere |

## ☁️ Deploy to Render (one click)

1. Push this repo to GitHub.
2. Go to **render.com → New → Blueprint**, point it at the repo (`render.yaml` is at the root).
3. Render creates the **web service** (Docker, free) and generates `JWT_SECRET`.
   It will ask for `DATABASE_URL`: Render's free tier allows only **one** Postgres
   database per account, so paste the **External Database URL** of your existing
   Render Postgres (Dashboard → Databases → your db → Info tab). The app creates
   its own tables alongside anything already there, and migrations run automatically
   at container start.
4. Open the service URL on your phone — free tier sleeps after 15 min idle and wakes on traffic (~1 min cold start).

> **Uploads on free tier:** Render's free plan has no persistent disk, so uploaded photos
> survive per-deploy but are lost on redeploy/restart. `StorageProvider`
> (`server/src/storage.ts`) is the swap point for S3/R2 — implement it, set the env vars,
> no route changes needed.

## 🔌 Swapping the AI provider

1. Implement `AIProvider` in `server/src/ai/<name>.ts` (`generatePerson`, `tryOn`,
   `detectPerson` — geometry only, never sensitive attributes).
2. Build prompts with `server/src/ai/prompts.ts` (safety constraints are unit-tested —
   keep them).
3. Register in `server/src/ai/index.ts` and set `AI_PROVIDER=<name>`.

Good next providers: Gemini image editing (needs `GEMINI_API_KEY`), Replicate IDM-VTON
(needs `REPLICATE_API_TOKEN`) for true garment warping. Stubs for both already exist and
fail with a clear "not configured" message.

## 🗺 Roadmap

- **Phase 2** — advanced patterns/materials rendering, measurements-based fit, more poses,
  extra avatar garments (sherwani, lehenga, gowns… — see `CATALOG_TO_RENDER` in client),
  BullMQ queue, S3 storage.
- **Phase 3** — upload real clothing / paste product URL → background removal → try-on;
  "find this outfit online" product matching, affiliate/retailer integration.

## 🔒 Privacy & safety

- Uploaded photos: random unguessable URLs, owner-only access/delete, never used for training.
- "Delete my photos" / "Delete my data" in Profile; full statement at `/privacy`.
- Kids: catalog auto-filtered to age-appropriate items; generation prompts enforce modest,
  everyday clothing; minimal data collection; guest-only under 13.
- No sexualized generation, ever — enforced in the prompt builder and covered by tests.
