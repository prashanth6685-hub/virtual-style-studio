# Virtual Style Studio — Build Brief (Phase 1 MVP)

## Mission
Build a production-quality, mobile-first full-stack web app called **Virtual Style Studio**:
"See how an outfit will look on me before I buy it." Phase 1 MVP now; architect so
Phase 2/3 (advanced patterns/materials, real-clothing upload, shopping integration) can be
added without rewrites.

## Repo & delivery
- Work in `~/workspace/virtual-style-studio`. GitHub repo `virtual-style-studio` under the
  user's account (public — user prefers public repos). Branch `main`.
- Push with: `python3 ~/workspace/skills/github/bin/push_project.py ~/workspace/virtual-style-studio virtual-style-studio`
  (creates the repo if needed, pushes via Git Data API; default public — do NOT pass --private).
- Monorepo layout:
  ```
  virtual-style-studio/
    client/          # React 18 + TypeScript + Vite + Tailwind
    server/          # Node 20 + Express + TypeScript + Prisma + PostgreSQL
    packages/shared/ # shared TS types + clothing catalog + color palettes
    Dockerfile  render.yaml  docker-compose.yml  .env.example  README.md
  ```

## Tech choices (best available, free-tier deployable)
- Client: React 18, TS, Vite, Tailwind CSS, react-router-dom. Hand-rolled components,
  fashion-forward aesthetic. No heavy component kit.
- Server: Express + TS, Prisma ORM, PostgreSQL (docker-compose for local dev;
  Render managed Postgres in prod via render.yaml).
- Auth: bcrypt + JWT in httpOnly cookie. Email/password signup+login. Guest mode
  (`POST /api/auth/guest` → guest JWT, data scoped to guest). Google/Apple buttons
  rendered in a disabled "coming soon" state — never fake a working OAuth flow.
- Uploads: multer, 10MB limit, allowlist jpg/jpeg/png/webp (HEIC: try convert, else 415
  with clear message). Random unguessable filenames under `UPLOAD_DIR`, served at
  `/uploads/:name`. `StorageProvider` interface so S3 can replace local disk later.
- AI: `AIProvider` interface in `server/src/ai/types.ts`:
  `generatePerson(prefs)`, `tryOn(input)`, `detectPerson(image)` (geometry only — NEVER
  infer or label sensitive attributes of a real person), `name()`.
  Implementations:
  - `PollinationsProvider` (default, `AI_PROVIDER=pollinations`): free, keyless.
    People: `https://image.pollinations.ai/prompt/{enc}` text-to-image.
    Try-on: img2img edit via `?image={publicUrl}`. If the source image URL is not
    publicly reachable (local dev), throw a clear ProviderError telling the user to set
    `PUBLIC_BASE_URL` or use the mock provider.
  - `MockAIProvider` (`AI_PROVIDER=mock`): deterministic placeholder results, every
    result clearly watermarked/labeled "Preview".
  - `GeminiProvider`, `ReplicateProvider`: stubs that throw "not configured — set
    GEMINI_API_KEY / REPLICATE_API_TOKEN". Interface only, no keys in repo.
  - Prompt builder MUST enforce: fully-clothed, modest, non-sexualized output; for
    children: modest everyday clothing only. Neutral appearance descriptors only
    (skin tone, hair, build) — no stereotyping labels.
- Jobs: `JobQueue` interface + `InMemoryJobQueue` (progress callbacks, retries with
  backoff). All AI work is async: `POST` returns `{jobId}`, `GET /api/ai/jobs/:id`
  returns `{status: queued|processing|done|failed, progress, result?, error?}`.
  Document the BullMQ/Redis swap path in README.
- Validation: zod on all inputs. Logging: pino. Rate limiting: express-rate-limit.
- Tests: vitest. API docs: `server/API.md`.

## Prisma models
User(id, email unique?, passwordHash?, authProvider, isGuest, createdAt),
Avatar(id, userId, name, personType, config Json, createdAt, updatedAt),
SavedLook(id, userId, name, outfit Json, resultImageUrl?, modelRef Json, createdAt),
GeneratedImage(id, userId?, jobId, kind, url, prompt?, createdAt),
Measurement(id, userId, heightCm?, chestCm?, waistCm?, hipCm?, shoulderCm?, inseamCm?),
StylePreference(id, userId, prefs Json),
AIJob(id, userId?, type, status, progress, input Json, result Json?, error?, createdAt, updatedAt),
UploadedImage(id, userId?, filename, mime, size, purpose, createdAt).
Ownership middleware: users touch only their own rows.

## API (`/api`)
- `POST /auth/signup`, `POST /auth/login`, `POST /auth/guest`, `POST /auth/logout`, `GET /auth/me`
- `POST /uploads/photo` (multipart), `DELETE /uploads/:id`
- `POST /ai/people` `{filters, count}` → job (generates 8 people); `GET /ai/jobs/:id`
- `POST /tryon` `{model:{kind:'upload'|'aiPerson'|'avatar', ref}, outfit:{...}}` → job,
  EXCEPT avatar kind which renders server-side from the SVG spec and returns `{svg}` immediately
- `GET /catalog` → clothing catalog JSON (from packages/shared)
- `POST /outfits/suggest` `{occasion, weather, style, colorPref, budget, personType}` → rule-based outfit
- `GET /colors/match?hex=1a2b4c` → complementary color suggestions (static color-theory map)
- `GET/POST /avatars`, `PUT/DELETE /avatars/:id`
- `GET/POST /looks`, `PUT/DELETE /looks/:id`
- `GET /health` → `{ok, provider, email:false}` style flags

## Frontend routes
1. `/` Landing — headline "Try It. Style It. Love It.", subheading
   "Create your look and see how different clothes, colors, and styles look on you before you buy.",
   4 CTAs: Create My Look / Try With My Photo / Create an Avatar / Explore Styles.
   Example-looks gallery (images will be placed at `client/public/examples/`), feature
   highlights, privacy note, footer.
2. `/start` — "Who are you styling?" cards: Man / Woman / Boy / Girl. Persists personType.
3. `/create` — three tabs:
   - Upload My Photo: file input + `accept="image/*" capture="environment"` for mobile camera;
     privacy notice ("Your photo is used only to create your virtual try-on. You control
     whether it is stored or deleted."); simple canvas crop/reposition; "Use this photo".
   - Choose AI Person: neutral filter bar (age group, skin-tone swatches, hair color,
     hair style, body type — no stereotyping labels), grid of 8 (job + polling + skeletons),
     "Generate More People", select → `/studio`.
   - Create Avatar: parametric SVG builder (see below), live preview, Save Avatar / Reset / Edit.
4. `/studio` — main try-on. Left/top: model preview (photo/img or SVG avatar, stays visible).
   Right/bottom: tabs Tops / Bottoms / Dresses / Shoes / Accessories, then Color (named
   palette groups + custom picker), Pattern, Material, Fit, Size. "✨ Try It On" →
   "Creating your look…" progress → result + Before/After slider + Save Look.
5. `/styles` — Explore Styles: preset cards per personType (Casual, Business Casual, Formal,
   Streetwear, Minimalist, Party, Summer, Winter, Traditional, Athletic…) → applies → `/studio`.
6. `/generator` — "Create an Outfit for Me": occasion/weather/style/color/budget → suggestion → Try This Look.
7. `/looks` — saved looks grid; compare mode (up to 4 side-by-side); reuse/edit/duplicate/delete.
8. `/profile` — account, measurements, style prefs, "delete my photos / delete my data", logout.
9. `/privacy` — plain-language privacy page.
- Mobile: bottom nav Home | Try On | Avatar | Outfits | Profile. Desktop: left nav, center
  preview, right controls. Loading skeletons, empty states, error toasts, ARIA labels,
  keyboard nav, 44px+ touch targets.

## Avatar SVG system (`client/src/avatar/`)
- `types.ts` — `AvatarConfig`: personType, skinTone (12-step scale), undertone (warm/cool/neutral),
  face{shape, eyeShape, eyeColor, brows, nose, lips, facialHair?, makeup?},
  hair{color, length, texture, style}, body{height, build, shoulder, waist, hips}, ageGroup.
- `AvatarSVG.tsx` — layered SVG: defs (skin tones, hair paths per style, SVG pattern defs),
  body base per build, clothing layers drawn parametrically to body geometry via
  `renderGarment(garment, colorway)` — never a pasted raster image. Poses: front, side,
  three-quarter. Identity (face/skin/hair/body) MUST NOT change when clothing changes.
- MVP garments: tops (tshirt, polo, shirt, hoodie, kurta, blouse, tanktop, sweater),
  bottoms (jeans, chinos, shorts, skirt, leggings), dresses (casual, maxi), shoes
  (sneakers, heels, sandals, boots), accessories (watch, sunglasses, cap, hat, belt,
  necklace, earrings, scarf, tie). Flat-illustration fashion style.
- `colorway`: `{base: hex, pattern, patternColor?, material}` → SVG fill/pattern + shading.

## Catalog (`packages/shared/`)
- `catalog.ts`: clothing items per personType (use the category lists from the user's spec:
  men/women/boys/girls tops/bottoms/dresses/indian-wear/outerwear/shoes/accessories),
  each `{id, name, category, personTypes[], fits[], sizes[]}`.
- `colors.ts`: named palette grouped (Basics, Reds, Blues, Greens, Pinks, Purples,
  Yellow/Orange, Neutrals) + color-style modifiers (pastel/neon/jewel/earth/muted…)
  as hex-transform functions + `matchColors(hex)` suggestions.

## Safety & privacy (non-negotiable)
- No sexualized content, ever; kids' catalog auto-filtered to age-appropriate items.
- Uploaded/generated images: private to owner, random URLs, delete endpoints, no training use.
- Under-13: guest-only, minimal data, no marketing.

## DevOps
- `Dockerfile`: multi-stage (build client+server → run node, serve `client/dist` statically).
- `render.yaml`: web (docker, free) + postgres (free). Env: `DATABASE_URL` (fromDatabase),
  `JWT_SECRET` (generateValue), `AI_PROVIDER=pollinations`, `PUBLIC_BASE_URL` (fromService URL).
  README notes: Render free disk is ephemeral — uploads survive per deploy; S3 swap documented.
- `.env.example`, `docker-compose.yml` (postgres for local), `README.md` (setup, scripts,
  architecture diagram, "how to swap AI providers", Phase 2/3 roadmap).
- Root `package.json`: `dev` (concurrently), `build` (tsc + vite), `test`, `typecheck`.

## Quality gates (MUST pass before push)
- `npm run build` clean, `npm test` green (meaningful tests: provider interface + prompt
  safety rules, color utils, outfit suggester, auth flow, upload validation, avatar config).
- Responsive at 390px and 1280px. No secrets committed. No `node_modules`/`.env`/uploads in git.
- If you bundle throwaway check scripts with esbuild inside `client/`, delete emitted
  sibling `.css` artifacts immediately.

## Execution
You are the coordinator. You may spawn up to 2 workers (backend, frontend); they may not
spawn further. Suggested order: (1) scaffold + packages/shared + server; (2) client in
parallel once shared types exist; (3) wire-up + tests + build fixes; (4) Dockerfile,
render.yaml, README, .env.example; (5) push via push_project.py; (6) report back:
repo URL, `npm run build` + `npm test` evidence, what works end-to-end, what is
mock/labeled-preview, and the exact Phase 2/3 extension points.
Keep commits conventional and clean. Work until the gates pass — do not report partial.
