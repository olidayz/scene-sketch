# Scene Sketch / Spacecadet

Spacecadet’s internal AI video production app: scene tests, reusable formats and episodes, character and style references, storyboards, and fal.ai video generation.

Production: https://scene-sketch-oli.oli3003.chatgpt.site/

This repository was recovered from the original Sites source repository. The published version 14 corresponds to commit `235a692810393fd4fae5ee1ad480981ce6d6d46c`. The original 15 commits are retained. Exporting to GitHub does not redeploy the app or transfer its production data.

## Clone and work on the app

Use Node.js 22.13 or newer (verified with Node 22.23) and npm. On Windows, use WSL for the existing shell scripts.

```sh
git clone https://github.com/olidayz/scene-sketch.git
cd scene-sketch
npm ci
git switch -c your-name/your-change
npm run dev
```

Open the local URL printed by Vite. The existing Linux-only installer and build wrappers require `flock` and GNU `timeout`. These direct commands use the locked local dependencies on macOS and Linux:

```sh
npm exec -- vinext build
node --test tests/*.test.mjs
```

The rendered HTML test needs the build output. Server tests use an in-memory SQLite database and mocked service requests, so they do not generate paid videos.

### Export verification (14 September 2026)

The locked `npm ci` install and direct Vinext build succeeded on macOS with Node 22.23. The existing suite ran 32 tests: 30 passed and 2 failed. The rendered HTML test imports a Cloudflare Worker bundle directly into Node, which rejects the `cloudflare:` module protocol. The catalog CSS test expects scrolling utilities absent from the built stylesheet. Application source, tests and dependency versions are unchanged from the recovered published revision; these limitations remain visible for follow-up rather than being hidden or skipped.

All 15 recovered commits (223 unique file blobs) were checked for common credential patterns and accidentally tracked environment, runtime or database files. The matches were an explicitly fake test encryption secret and a type declaration. No apparent embedded production credentials were found. Production environment values were not exported.

## Runtime requirements

The app uses React 19, Vinext/Vite and Cloudflare Workers. Its source, dependency lockfile, static demo assets, and six database migrations are included.

| Requirement | Purpose |
| --- | --- |
| D1 binding `DB` | Projects, scenes, formats, takes, characters and encrypted per-user connections |
| R2 binding `BUCKET` | Uploaded references, recordings and generated media |
| `KEY_ENCRYPTION_SECRET` | Encrypts saved per-user fal.ai API keys |
| `FAL_KEY` | Optional shared fal.ai key; otherwise users connect individual keys |
| Trusted Sites identity header `oai-authenticated-user-id` | Identifies the current owner for protected workspace operations |

`vite.config.ts` declares local D1 and R2 bindings. A local checkout does not contain production database rows, media, secrets, or signed-in sessions. The UI can be previewed locally, but workspace APIs require trusted identity and an initialized database. Sign-in is supplied by the Sites hosting platform; cloning alone does not reproduce that platform. The existing tests provide mocked identity and apply all migrations in memory for server development.

For local Worker secrets, copy the blank template and fill it privately:

```sh
cp .env.example .dev.vars
```

Use a separate random encryption secret for development. Production’s existing encryption secret must remain unchanged to keep stored connections readable. Never put server keys in browser-visible environment variables. Configuring independent hosting requires its own D1/R2 resources, migrations and trusted authentication layer; the app must not trust identity headers supplied directly by public clients.

## Team workflow and production

Push a feature branch and open a pull request against `main`. GitHub pushes are source checkpoints only: this repository has no deployment workflow, and pushing here does not change the current live site.

The repository is private. The owner can grant the team access in GitHub **Settings → Collaborators**. Existing Sites viewer permissions do not grant GitHub access. Teammates need repository write access to push branches.

`.openai/hosting.json` retains the original Sites project identity and binding names because the build imports this file. It contains configuration, not credentials. Treat deployment to that project as a separate deliberate production action. This GitHub export does not include the short-lived Sites Git credential or automatically connect GitHub to Sites.

## Files and exclusions

- `app/`, `components/`, `lib/`: UI and application behavior.
- `db/`, `drizzle/`: database schema and migrations.
- `worker/`, `build/`, `vite.config.ts`: Worker entry and build integration.
- `tests/`: existing UI, HTML, director and server tests.
- `public/demo/`: intentional versioned demo reference images.

`.gitignore` excludes local environment files, Worker secrets, dependencies, build output, runtime caches, local databases, uploads, generated media directories, logs and editor state. `.env.example` contains blank placeholders only. Keep `package-lock.json`, migrations and authored/demo assets in Git.

The original starter guidance is retained in [docs/STARTER.md](docs/STARTER.md) for context; use the setup commands above for this export.
