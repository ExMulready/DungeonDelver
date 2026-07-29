# DungeonDelver

An AI-narrated Dungeons & Dragons campaign that writes itself as you play.

Create a character, and a language model narrates a choose-your-own-adventure
campaign one scene at a time. Everything it knows is kept in a markdown
**chronicle** it reads back on every turn — so it remembers the innkeeper you
lied to forty scenes ago, and you can open the file and read it yourself.

Installable as a PWA. Styled after Diablo 2, in CSS and SVG only — no image
assets anywhere in the interface, including the character portraits.

---

## How it runs

One codebase, two deployment targets, chosen entirely by environment variable.
Both run as containers; they differ in what is around the container.

|                | Docker Compose (free, offline) | Vercel (public)          |
| -------------- | ------------------------------ | ------------------------ |
| Narrator       | Ollama `qwen3.5:2b`            | Groq `llama-3.3-70b`     |
| Database       | Postgres container             | Supabase Postgres        |
| Chronicle      | Real `.md` files + DB mirror   | DB text column           |
| Image          | [`Dockerfile`](Dockerfile)     | [`Dockerfile.vercel`](Dockerfile.vercel) |

Three seams make that work, and nothing else in the app knows which target it
is on:

- [`src/lib/llm/provider.ts`](src/lib/llm/provider.ts) — returns a model
- [`src/lib/chronicle/store.ts`](src/lib/chronicle/store.ts) — reads/writes the chronicle
- [`src/lib/db/index.ts`](src/lib/db/index.ts) — one Drizzle client

---

## Quick start

```bash
cp .env.example .env
```

Fill in `AUTH_SECRET` (`openssl rand -base64 32`) and a `DATABASE_URL`, then:

```bash
npm install
npm run db:migrate
npm run dev
```

### Backing services

Local Postgres and Ollama, without running the app in a container:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Or the whole stack, app included:

```bash
docker compose up --build
```

The first run pulls the model (~1.4 GB) and takes a while. Chronicles land in
`./data/campaigns/<id>/chronicle.md` where you can read them.

---

## The chronicle

The heart of the thing. After every turn the app rewrites a structured markdown
document and feeds it back as the narrator's memory:

```markdown
# Chronicle: The Ashen Vigil
## Dramatis Personae      — who was met, their disposition, whether they live
## World & Locations      — places found and their state
## Quest State            — threads pulled, finished, failed
## Boons & Burdens        — what is carried
## Prior Acts             — older scenes, compacted into prose
## Recent Scenes          — the last handful, verbatim
```

Two design decisions are load-bearing:

**The document is generated, never parsed.** The database holds the truth and
the markdown is a projection of it. An earlier design had the model rewrite the
markdown directly — that fails the moment a small model drops a heading, and it
fails silently, corrupting the campaign.

**Compaction is mandatory.** Every 8 turns, scenes that have fallen outside the
verbatim window are folded into `Prior Acts`. Without it the prompt grows
without bound, and both targets punish that: Groq's free tier is capped per
minute, and a CPU-hosted model slows in direct proportion to context length.

## Turns

Two model calls per turn, deliberately:

1. **Narration** — streamed to the player as it is written.
2. **Extraction** — a small JSON call over *only* the new prose, returning
   choices, HP/XP deltas, items, and world facts.

One combined call is cheaper, but "prose, then a fenced JSON block" is not
something a 2B model does reliably, and a malformed response would cost the
player their turn.

**Dice are rolled server-side** in [`src/lib/game/dice.ts`](src/lib/game/dice.ts),
never by the model. The narrator proposes a check; the server rolls it and hands
back the result as settled fact. Letting the model resolve its own checks turns
every roll into whatever makes the better paragraph — which is the difference
between a game and a story generator.

## Portraits

No image model. Faces are layered SVG composed from a parametric part library in
[`src/lib/portraits/`](src/lib/portraits/), selected by a seeded PRNG from
`(race, gender, seed)`.

One face costs **four bytes** — only the seed is stored — and regenerates
identically forever. Six races share one morphed construction rather than six
drawings, so an elf and a half-orc read as the same art direction.

Contact sheet of every race/gender/seed combination: `/dev/portraits`.

---

## Environment notes

Findings from this machine that are worth knowing before you debug something
that is not your fault.

### exFAT volumes break `next build`

exFAT has no symlink or junction support. Both bundlers need it for any package
marked external:

- Turbopack panics with `failed to create junction point`
- webpack fails with `EISDIR: illegal operation on a directory, readlink`

The workaround is already applied: **no native dependencies anywhere in the
tree**, and no `serverExternalPackages` in `next.config.ts`. That is why
passwords use `scrypt` from `node:crypto` rather than an Argon2 binding — see
[`src/lib/auth/password.ts`](src/lib/auth/password.ts). scrypt is memory-hard,
OWASP-approved, and has no binary to link.

If you add a dependency with a `.node` file, the build will break on exFAT.
Check with `Get-Volume -DriveLetter D | Select FileSystemType`.

### `npm run dev` and `tsc` are unaffected

Only production builds touch symlinks. Development and typechecking work fine.

### Docker needs disk on the system drive

Docker Desktop stores its VM disk on `C:` by default. If `C:` is short on
space the engine dies mid-pull and every command returns
`500 Internal Server Error`. Relocate it under
**Settings → Resources → Advanced → Disk image location**.

---

## Security

Supabase exposes every table in `public` through PostgREST to anyone holding
the anon key. This app connects over a direct Postgres connection and never
uses PostgREST, so the correct configuration is **RLS enabled with no
policies** — the app bypasses RLS as the table owner, and anonymous access is
blocked completely.

```sql
ALTER TABLE public."user"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."verificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_turn       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_memory     ENABLE ROW LEVEL SECURITY;
```

Without this, `passwordHash` and OAuth `access_token`/`refresh_token` are
readable by anyone with the anon key, which is public by design.

---

## Deploying to Vercel

Vercel builds [`Dockerfile.vercel`](Dockerfile.vercel) by filename convention
and runs it as a Function backed by an OCI image
([docs](https://vercel.com/docs/functions/container-images)).

A Vercel container is still a stateless request-serving unit — it brings no
sidecars along. There is nowhere for a Postgres volume or a warm 1.4 GB local
model to live, so the managed services are not optional there:

```
LLM_PROVIDER=groq          # ollama has nothing to talk to
CHRONICLE_STORE=pg         # there is no writable disk
DATABASE_URL=...:6543/...  # Supabase transaction pooler
GROQ_API_KEY=...
AUTH_SECRET=...            # openssl rand -base64 32
AUTH_TRUST_HOST=true
```

`AUTH_TRUST_HOST` is not optional either: without it every request fails with
`UntrustedHost` before it reaches a page.

Use the **transaction pooler** (port 6543) rather than a direct connection.
[`src/lib/db/index.ts`](src/lib/db/index.ts) detects that port and disables
prepared statements, which PgBouncer cannot hold across multiplexed
connections.

One ceiling worth knowing: the turn route asks for `maxDuration = 300`, but
Hobby caps functions at 60 seconds. Groq finishes a turn in a few seconds, so
this only bites if you point the deploy at something slower.

---

## Google sign-in

Optional — the provider is only registered when both variables are present, so
email/password works without it.

Create an OAuth client at
[console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
with these redirect URIs:

```
http://localhost:3000/api/auth/callback/google
https://<your-app>.vercel.app/api/auth/callback/google
```

---

## Scripts

| Command               | Does                                       |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Development server                         |
| `npm run build`       | Production build                           |
| `npm run typecheck`   | `tsc --noEmit`                             |
| `npm run db:generate` | Generate a migration from the schema       |
| `npm run db:migrate`  | Apply migrations                           |
| `npm run db:studio`   | Drizzle Studio                             |

## Layout

```
src/
├─ app/
│  ├─ (auth)/signin, signup
│  ├─ campaigns/            list, and [id] play screen
│  ├─ characters/new/       the five-step forge
│  ├─ dev/portraits/        portrait contact sheet
│  └─ api/campaigns/[id]/turn/   streaming turn endpoint
├─ components/  ui/, portrait/, auth/, pwa/
└─ lib/
   ├─ auth/      password hashing, zod schemas, server actions
   ├─ chronicle/ markdown rendering + storage adapters
   ├─ db/        Drizzle schema and client
   ├─ game/      SRD data, dice, turn engine
   ├─ llm/       provider seam, prompts, output schemas
   └─ portraits/ seeded PRNG, palettes, composition
```

---

Character options derive from the SRD 5.1, used under CC-BY-4.0.
