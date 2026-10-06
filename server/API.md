# Virtual Style Studio — API Reference

Base URL: `/api`. Every error uses the envelope `{error: {code, message}}`.
Auth is a JWT in the httpOnly cookie `vss_token` (set by signup/login/guest).
Guest tokens are accepted by `requireAuth` — guests get their own scoped user id.

Rate limits: `/api/auth/*` 60 req / 15 min; `/api/ai/*` and `/api/tryon` 30 req / min.
`429` returns `{error:{code:'RATE_LIMITED',...}}`.

## Avatar rendering decision (important)

`POST /api/tryon` with `model.kind === 'avatar'` returns **200 immediately** with
`{render:'client', spec:{model, outfit}}` — the **client renders the SVG avatar
locally** from `AvatarConfig` + `Colorway` and never calls the server again for
that try-on.

Rationale: the avatar is fully parametric (identity geometry + garment layers
drawn from the same spec). Server-side SVG rendering would duplicate the
client's renderer and add a network round-trip for zero benefit; the avatar
page already renders the identical SVG for the live preview. This also makes
avatar try-on work fully offline and keeps AI provider spend at zero.

Only `upload` / `aiPerson` models go through the async AI job pipeline.

## Endpoints

### Health
- `GET /api/health` → `{ok:true, provider:'pollinations', time, db:true|false, email:false}`

### Auth
- `POST /api/auth/signup` `{email, password, name?}` → `201 {user}` (`409 EMAIL_TAKEN`)
- `POST /api/auth/login` `{email, password}` → `200 {user}` (`401 INVALID_CREDENTIALS`)
- `POST /api/auth/guest` → `201 {user}` (guest JWT; data scoped to guest id)
- `POST /api/auth/logout` → `{ok:true}` (clears cookie)
- `GET /api/auth/me` → `{user}` (`401 AUTH_REQUIRED` when signed out)
- Google/Apple OAuth: **not implemented** — the frontend renders disabled
  "coming soon" buttons; we never fake a working OAuth flow.

### Uploads
- `POST /api/uploads/photo` — multipart, field `photo`; optional `purpose`
  (`tryon|avatar|other`, default `tryon`). Auth required.
  - Allowlist: `image/jpeg`, `image/png`, `image/webp`; 10MB max.
  - HEIC/HEIF → `415 UNSUPPORTED_MEDIA_TYPE` with a clear message
    ("export as JPEG or PNG"). Other types → `415`. Over 10MB → `413`.
  - Filenames are random 32-hex-char + extension (unguessable), stored under
    `UPLOAD_DIR`. → `201 {id, url, mime, size}` with `url=/uploads/:name`.
- `DELETE /api/uploads/:id` — owner only; deletes file + row → `{ok:true}`
- `GET /uploads/:name` — static file serving (no listing).

### AI jobs (async)
- `POST /api/ai/people` `{filters:{personType, ageGroup?, skinTone?, undertone?, hairColor?, hairStyle?, bodyType?}, count?}` (1–8, default 8) → `202 {jobId}`
- `GET /api/ai/jobs/:id` → `{status:'queued'|'processing'|'done'|'failed', progress:0-100, result?, error?}` (`404` for unknown id)

### Try-on
- `POST /api/tryon` `{model:{kind:'upload'|'aiPerson'|'avatar', id?, imageUrl?, config?}, outfit:{top?,bottom?,dress?,outerwear?,shoes?,accessories[]}}`
  - avatar → `200 {render:'client', spec:{model,outfit}}` (see decision above)
  - upload/aiPerson → `202 {jobId}` (provider tryOn; poll `/api/ai/jobs/:id`)
  - Fails fast with `400 NOT_PUBLIC` when the source image isn't publicly
    reachable (localhost/private URLs) — set `PUBLIC_BASE_URL` or use `AI_PROVIDER=mock`.

### Catalog / outfits / colors
- `GET /api/catalog` → `{items, categories}` (from `@vss/shared`)
- `GET /api/catalog/items?personType=woman&category=tops` → filtered `{items, categories}`
- `POST /api/outfits/suggest` `{personType, occasion?, weather?, style?, colorPref?, budget?}` → `{outfit, notes}` (rule-based; boy/girl restricted to kidSafe items)
- `GET /api/colors/palette` → `{palette}` (8 groups per spec section 10)
- `GET /api/colors/match?hex=1a2b4c` → `{base, matches:[{name,hex,relation}]}` (complementary/analogous/triadic)

### Avatars (auth + DB required)
- `GET /api/avatars` → `{avatars}` (caller's only)
- `POST /api/avatars` `{name, personType, config}` → `201 {avatar}` (config validated)
- `PUT /api/avatars/:id` → `{avatar}`; `DELETE /api/avatars/:id` → `{ok:true}` (owner only, else `403`)

### Saved looks (auth + DB required)
- `GET /api/looks` → `{looks}`
- `POST /api/looks` `{name, outfit, resultImageUrl?, modelRef?}` → `201 {look}`
- `PUT /api/looks/:id` → `{look}`; `DELETE /api/looks/:id` → `{ok:true}` (owner only)

DB-backed routes return `503 DB_UNAVAILABLE` when `DATABASE_URL` is unset.

## Environment variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | prod | — | Postgres connection string. Unset → DB-free endpoints still work; DB routes 503. |
| `JWT_SECRET` | prod | dev-only fallback | 16+ chars; must be set in production. |
| `PORT` | no | `4000` | |
| `CLIENT_URL` | no | `http://localhost:5173` | CORS origin (credentials on). |
| `UPLOAD_DIR` | no | `./uploads` | Local disk storage. **Ephemeral on Render free tier** — survives per deploy; see S3 swap below. |
| `PUBLIC_BASE_URL` | for AI try-on | — | Public base URL (e.g. `https://app.onrender.com`) so providers can fetch upload URLs. |
| `AI_PROVIDER` | no | `pollinations` | `pollinations` (free/keyless) \| `mock` (labeled Preview) \| `gemini` \| `replicate`. |
| `GEMINI_API_KEY` | for gemini | — | Stub throws "not configured" until set. |
| `REPLICATE_API_TOKEN` | for replicate | — | Stub throws "not configured" until set. |
| `LOG_LEVEL` | no | `debug`/`info` | pino level. |

## Swapping AI providers

`server/src/ai/index.ts#getProvider()` reads `AI_PROVIDER`. To add a provider,
implement the `AIProvider` interface (`generatePerson` / `tryOn` /
`detectPerson` (geometry only) / `name()`) and register it in the factory.
Prompt safety is centralized: build prompts with `buildPersonPrompt` /
`buildTryOnPrompt` and gate with `isSafePrompt`.

## Job queue → BullMQ/Redis swap path

Routes depend only on the `JobQueue` interface (`enqueue`/`get`/`onUpdate`).
To move to BullMQ: write a `BullMQJobQueue implements JobQueue` (BullMQ
`Queue` + `Worker` with the same progress/attempt semantics), construct it in
one place, and inject it into the ai/tryon routes. Job status polling
(`GET /api/ai/jobs/:id`) stays unchanged.

## Uploads → S3 swap path

Routes use the `StorageProvider` interface (`save`/`remove`/`resolvePath`).
Implement `S3StorageProvider` with the AWS SDK, construct it when
`S3_BUCKET` is set, and serve via signed URLs instead of `/uploads/:name`.
