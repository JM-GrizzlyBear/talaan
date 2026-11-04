# Talaan

Every X-ray, lab result and prescription for your family, and where the paper is.

Scan or upload a record, keep each X-ray film together with its reading, and note which folder, box or bag holds the original. QR labels on the folders tell you what should be inside, and Talaan reminds you when films are lent to a doctor, when a follow-up is due, and how your lab numbers compare over time. It works on the web, iPhone, iPad and Android, all on one account.

_Talaan_ is Filipino for "record" or "list".

> **Status:** starting point. This repo has the base (sign in, sign out, protected pages, tests, Docker, CI). The features below are being built next.

---

## What's planned

- **Records:** X-rays, lab results, prescriptions, HMO approvals (LOA) and other papers, for each family member, with a timeline and filters.
- **Scan and upload:** photos or PDFs go straight to private storage; Talaan reads the date, doctor, hospital and lab numbers so you only check them.
- **X-ray with its reading:** the film photos and the radiologist's reading are one record.
- **Places and QR labels:** folders, boxes, envelopes, drawers and bags, each with its own QR label. Print sheets of labels (including blank ones to name later) and scan a label to see what should be inside.
- **Lent out:** who has the films, since when, with a reminder until they come back.
- **Reminders:** a date and time, alerts before it (30 minutes, 1 hour, 2 hours, 1 day, 1 week, or your own), and repeats.
- **Compare lab results:** the numbers and normal ranges side by side, newest first.
- **Family by invitation:** each person accepts or declines by email before you see their records. Medical ID for each person.
- **Doctor share links:** stop working on the day you pick, with an optional 4-digit code.
- **Search everything:** records, lab values, places and QR codes, family and reminders, in English or Filipino.
- **Security:** passwords and passkeys on the web; Face ID, fingerprint and PIN in the phone app; locking after being away; download or delete all data (Data Privacy Act of 2012).
- **Theme colors:** pick a set of 2 to 4 colors, light or dark.
- **Phone and tablet app:** Expo (iOS and Android), on the same API, with offline use.

Talaan keeps records. It doesn't diagnose or give medical advice.

---

## What's inside now

- **Sign in, sign out** (and a register page for now; admin-created accounts come with the accounts feature)
  - Sign in with a username or an email
  - Passwords hashed with bcrypt
  - Sessions stored in Postgres, sent as an HTTP-only cookie
- **Protected pages**: signed-out visitors are sent to `/login` and come back after signing in
- **One source of truth for forms**: the same zod rules check the form in the browser and the request in the API
- **Tests**:
  - API unit tests
  - API integration tests on a separate `_test` database that's reset before every test
  - Website unit tests
- **Docker**:
  - `docker compose up -d db` gives you Postgres while you code
  - `docker compose up --build` runs the whole app
- **GitHub Actions**:
  - CI on every PR: types, lint, build, formatting, tests, Docker image
  - A manual **Clear database** workflow
- Exact dependency versions only, ESLint, Prettier

---

## Tech stack

| Part     | Tools                                                                     |
| -------- | ------------------------------------------------------------------------- |
| Monorepo | Turborepo, pnpm workspaces                                                |
| API      | Node 22, Express 5, TypeScript, PostgreSQL (`pg`), dbmate migrations, zod |
| Login    | bcryptjs, express-session, connect-pg-simple (sessions in Postgres)       |
| Website  | React 19, Vite, Tailwind CSS v4, TanStack Query, React Router             |
| Shared   | `packages/shared`: zod schemas and types used by the API and the website  |
| Tests    | Vitest, supertest                                                         |
| Docker   | Postgres 17 for development; one production image (API + website)         |
| CI       | GitHub Actions                                                            |
| Hosting  | Netlify (website), Render (API), Neon (database)                          |

---

## Clean Architecture in 1 minute

The code is split into four layers. Each layer only uses the layers **inside** it:

```
presentation  →  application  →  domain
      ↓               ↓
infrastructure ───────┘ (implements the interfaces the inner layers define)
```

| Layer              | What lives there                                                                 | Knows about Express/Postgres? |
| ------------------ | -------------------------------------------------------------------------------- | ----------------------------- |
| **domain**         | Entities (`User`), rules, errors, repository **interfaces**                      | No                            |
| **application**    | Use cases (`RegisterUser`, `LogInUser`, …) and ports (`PasswordHasher`, `Clock`) | No                            |
| **infrastructure** | The real implementations: Postgres repositories, bcrypt, the clock               | Yes                           |
| **presentation**   | HTTP: routes, middleware, sessions, the error handler                            | Yes                           |

`apps/api/src/buildApp.ts` is the **composition root**: the one place that creates the real classes and hands them to the use cases. That's why the tests can swap in fakes, such as an in-memory repository or a fast password hasher.

What happens when someone signs in:

```
POST /api/auth/login
  → authRoutes        (presentation: rate limit, validates the body with zod)
  → LogInUser         (application: "find the user, check the password, or say no")
  → UserRepository    (domain interface)
  → PostgresUserRepository (infrastructure: SQL)
  ← errorHandler      (presentation: InvalidCredentialsError → 401 JSON)
```

The website uses the same idea: `infrastructure/api` (fetch calls) → `application` (TanStack Query hooks) → `presentation` (components and pages).

For Talaan, rules like "who can see this person's records?" and "is this lab number outside the normal range?" will live in `domain/`: plain code with no database, tested with scenarios like "Lea hasn't accepted the invitation yet → her records stay hidden".

New to Clean Architecture? The [pern-template README](https://github.com/JM-GrizzlyBear/pern-template#clean-architecture-explained-simply-no-coding-needed) explains it with a restaurant, no coding needed.

### Where does new code go?

| Question                                                                            | If yes, it goes in… | Example                                                                  |
| ----------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| Is it a **fact or rule of the business** that would be true even without computers? | `domain/`           | "Lowest number first; a number that waited 30 minutes goes first"        |
| Is it **one thing a person can do**, step by step?                                  | `application/`      | "Call next: pick the number, mark it called, tell the TV" → one use case |
| Does it **talk to a specific tool** (database, email, files, a library)?            | `infrastructure/`   | Storing tickets in PostgreSQL                                            |
| Is it about **the internet**: addresses, requests, answers, logins?                 | `presentation/`     | The `/api/...` routes and the live updates                               |
| Is it a **form rule** both the website and the API need?                            | `packages/shared/`  | "A folder name is required, at most 60 characters"                       |

---

## Project structure

```
talaan/
├── .env.example             # copy to .env → the Postgres user/password for docker compose
├── docker-compose.yml       # db (Postgres) and app (the production image)
├── Dockerfile               # production image: builds everything, the API serves the website
├── package.json             # root scripts, pinned pnpm version, Prettier
├── pnpm-workspace.yaml      # workspace: apps/* and packages/*; saveExact (no ^ versions)
├── turbo.json               # tasks: build, dev, check-types, lint, test, db:*
├── .github/workflows/
│   ├── ci.yml               # every PR and main: types, lint, build, formatting, tests, Docker build
│   └── clear-database.yml   # manual: empty every table of the database in the DATABASE_URL secret
├── apps/
│   ├── api/                 # Express API
│   │   ├── .env.example     # copy to apps/api/.env → the API's settings
│   │   ├── db/migrations/   # SQL migrations (dbmate): users, session
│   │   ├── vitest.config.ts # two test projects: unit and integration
│   │   ├── test/
│   │   │   ├── fixtures/            # test data: users, a fake clock
│   │   │   ├── unit/                # rules, schemas, use cases with fakes (no database)
│   │   │   └── integration/         # real HTTP requests against the test database
│   │   │       └── support/         # test database setup, seed, logged-in test browsers
│   │   └── src/
│   │       ├── domain/              # user/: entity, rules, errors, repository interface
│   │       ├── application/         # user/ use cases; ports/ (PasswordHasher, Clock)
│   │       ├── infrastructure/      # database/ (Postgres repositories), security/ (bcrypt), time/
│   │       ├── presentation/http/   # routes/, middleware/ (requireAuth, rateLimit), session, errors
│   │       ├── config/env.ts        # reads and checks the environment variables
│   │       ├── buildApp.ts          # composition root (also used by the tests)
│   │       └── main.ts              # starts the server
│   └── web/                 # React website (Vite)
│       ├── public/          # favicon and app icons (the Talaan logo)
│       ├── vite.config.ts   # dev server: forwards /api to the API on port 4000
│       └── src/
│           ├── infrastructure/api/  # http.ts (fetch + ApiError), authApi
│           ├── application/         # auth/ hooks (TanStack Query)
│           ├── presentation/
│           │   ├── components/      # brand/ (TalaanLogo), layout/, routing/ (RequireAuth, GuestOnly), ui/
│           │   ├── pages/           # LoginPage, RegisterPage, HomePage
│           │   └── format/          # dates and error messages (+ tests)
│           ├── App.tsx              # routes
│           └── index.css            # Tailwind and the theme colors
└── packages/
    └── shared/              # registerSchema, loginSchema, shared types
```

---

## Run it locally

### Requirements

- Node.js 22
- pnpm (`corepack enable` turns it on; the version is pinned in `package.json`)
- Turborepo installed globally: `pnpm add -g turbo`
- Docker Desktop

`pnpm` is only for installing packages. Everything else runs with `turbo run …`.

### 1. Create the env files

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Fill them in (the full list is under [Environment files](#environment-files)):

- In **`.env`**: pick a `POSTGRES_PASSWORD`, and for Option B a `SESSION_SECRET` (`openssl rand -hex 32`).
- In **`apps/api/.env`**:
  - put the same user, password and database name in `DATABASE_URL`
  - paste a `SESSION_SECRET` (`openssl rand -hex 32`)

### Option A: develop with hot reload (the usual way)

```bash
pnpm install
docker compose up -d db      # only Postgres
turbo run build              # builds the shared package
turbo run db:migrate         # creates the tables
turbo run dev                # API on :4000, website on :5173
```

Open http://localhost:5173, create an account, and you'll see the Talaan welcome page.

`turbo run dev` shows each app in its own panel: use ↑ / ↓ to switch between `@talaan/web#dev` and `@talaan/api#dev`. API errors only show in the API panel.

### Option B: run everything in Docker

```bash
docker compose up --build
```

This builds the production image, waits for Postgres, runs the migrations and starts the app on http://localhost:8080. Here the API also serves the website. Stop it with Ctrl+C. `docker compose down` removes the containers but keeps the data; `docker compose down -v` deletes the data too.

### Useful commands

| Command                                                           | What it does                                   |
| ----------------------------------------------------------------- | ---------------------------------------------- |
| `turbo run dev`                                                   | API + website with hot reload                  |
| `turbo run build`                                                 | Build everything                               |
| `turbo run check-types`                                           | TypeScript checks                              |
| `turbo run lint`                                                  | ESLint (website)                               |
| `turbo run test`                                                  | All tests                                      |
| `turbo run test:unit`                                             | API unit tests only (no database needed)       |
| `turbo run test:integration`                                      | API integration tests only (needs Postgres)    |
| `turbo run db:migrate`                                            | Apply new migrations                           |
| `turbo run db:rollback`                                           | Undo the last migration                        |
| `turbo run db:new --filter=@talaan/api -- create_something_table` | New migration file in `apps/api/db/migrations` |
| `pnpm format`                                                     | Format every file with Prettier                |
| `docker compose up -d db`                                         | Start only Postgres                            |
| `docker compose up --build`                                       | Run the whole app in Docker on :8080           |

---

## Environment files

`.env` files are in `.gitignore`. **Never commit them**, only the `.env.example` files.

### Root `.env` (used by docker compose)

| Variable            | Example                | Meaning                                          |
| ------------------- | ---------------------- | ------------------------------------------------ |
| `POSTGRES_USER`     | `talaan`               | Database user created by Docker                  |
| `POSTGRES_PASSWORD` | `pick_a_password`      | Its password (letters, numbers, `_`; no `@ : /`) |
| `POSTGRES_DB`       | `talaan`               | Database name                                    |
| `SESSION_SECRET`    | `openssl rand -hex 32` | Only for Option B (the app container)            |

### `apps/api/.env` (used by the API and dbmate)

| Variable         | Required | Example / meaning                                                                          |
| ---------------- | -------- | ------------------------------------------------------------------------------------------ |
| `PORT`           | no       | `4000`                                                                                     |
| `DATABASE_URL`   | yes      | `postgres://talaan:pick_a_password@127.0.0.1:5432/talaan?sslmode=disable` (same as `.env`) |
| `SESSION_SECRET` | yes      | at least 32 random characters: `openssl rand -hex 32`                                      |
| `COOKIE_SECURE`  | no       | `true` in production by default (HTTPS-only cookie); `false` for plain http                |
| `WEB_DIST_DIR`   | no       | Set by the Docker image: the built website the API should serve                            |

Use `127.0.0.1` instead of `localhost` in `DATABASE_URL` on Windows if dbmate says the connection was refused on `[::1]:5432`.

---

## How sign-in works

1. **Register** (`POST /api/auth/register`): the API checks the form with `registerSchema` and stores the username and email in lowercase. It hashes the password with bcrypt (12 rounds) and signs the new user in.
2. **Sign in** (`POST /api/auth/login`): the username or email and the password are checked. A wrong password and an unknown user get the **same** answer, so nobody can find out which accounts exist.
3. **Signing in starts a brand-new session.** The session is a row in the `session` table, and the browser gets a `talaan.sid` cookie:
   - `HttpOnly`: the page's JavaScript can't read it
   - `SameSite=Lax`
   - `Secure` in production: it's only sent over HTTPS
4. **Protected API routes** use the `requireAuth` middleware and read the user's id from the session.
5. **Sign out** (`POST /api/auth/logout`) deletes the session row, so the old cookie stops working.
6. **Rate limit**: 20 sign-in or register tries per visitor every 15 minutes (in memory). The limit is in `buildApp.ts`.

On the website, `useCurrentUser()` asks `GET /api/auth/me` once and every page shares that answer. `RequireAuth` protects pages, and `GuestOnly` sends signed-in users away from the sign-in and register pages.

---

## API overview

All routes start with `/api`. Errors always look like `{ "message": "…", "errors": { "field": ["…"] } }`.

| Method | Route                | Login? | What                                                        |
| ------ | -------------------- | ------ | ----------------------------------------------------------- |
| GET    | `/api/health`        | no     | `{ ok: true }` when the API can reach the database          |
| POST   | `/api/auth/register` | no     | `{ username, email, password }` → 201 `{ user }`, signed in |
| POST   | `/api/auth/login`    | no     | `{ login, password }` → `{ user }`                          |
| GET    | `/api/auth/me`       | yes    | `{ user }`, or 401                                          |
| POST   | `/api/auth/logout`   | no     | 204                                                         |

| Status | When                                                        |
| ------ | ----------------------------------------------------------- |
| 400    | The form didn't pass validation (`errors` says which field) |
| 401    | Not signed in, or wrong sign-in                             |
| 404    | Not found                                                   |
| 409    | Username or email already taken                             |
| 429    | Too many sign-in or register tries                          |

---

## Adding a feature

Each feature goes through the layers in the same order:

1. **Migration**: `turbo run db:new --filter=@talaan/api -- create_folders_table`, write the `create table`, then `turbo run db:migrate`.
2. **Shared**: a zod schema and type in `packages/shared/src/`, exported from `index.ts`.
3. **Domain**: `apps/api/src/domain/<feature>/` with the entity, rules, the repository interface and `errors.ts`.
4. **Application**: one use case per action in `apps/api/src/application/<feature>/`.
5. **Infrastructure**: a `Postgres…Repository.ts`.
6. **Presentation**:
   - `routes/<feature>Routes.ts`, with `requireAuth` and `schema.parse(req.body)`
   - map new errors in `errorHandler.ts`
   - add a `…Json` function in `toJson.ts`
7. **Wire it up**: in `buildApp.ts`, create the repository and use cases and mount the routes.
8. **Website**:
   - `infrastructure/api/<feature>Api.ts`
   - `application/<feature>/use….ts`
   - a page in `presentation/pages/`
   - a route in `App.tsx`, inside `<RequireAuth />`
9. **Tests**:
   - fixtures in `test/fixtures/`
   - unit tests for the rules
   - an integration test for the routes
   - add the new table to the `truncate` in `test/integration/support/seed.ts`

---

## Tests

```bash
docker compose up -d db
turbo run test
```

| Suite           | Where                       | What it checks                                                             |
| --------------- | --------------------------- | -------------------------------------------------------------------------- |
| API unit        | `apps/api/test/unit`        | User rules, shared schemas, use cases with fake repositories (no database) |
| API integration | `apps/api/test/integration` | Register, sign in, sign out, sessions, rate limit, errors                  |
| Website unit    | `apps/web/src/**/*.test.ts` | The API client (`ApiError`), error messages, dates                         |

### The test database

The integration tests **never touch your real data**:

- They use your `DATABASE_URL` database name plus `_test` (`talaan` → `talaan_test`), or `TEST_DATABASE_URL` if set.
- dbmate creates it if needed and applies every migration before the tests run.
- **Before every test**, all tables are emptied and the same seed data goes back in (users `maria` and `ana`, password `password123`), so every test starts from the same state.
- Safety guard: the tests refuse to run unless the database name ends in `_test`.
- Passwords use 4 bcrypt rounds in tests (12 for real), so the tests run fast.

In CI, the **Tests** job starts a `postgres:17` service and runs the same tests.

---

## GitHub workflows

### CI (`ci.yml`)

Runs on every pull request to `main` and every push to `main`, in three jobs:

1. **Type-check, lint and build**: `turbo run check-types lint build` and `prettier --check .`
2. **Tests**: every test, against a throwaway Postgres
3. **Docker image builds**: makes sure the production image still builds

Merge only when all three are green.

### Clearing a database (`clear-database.yml`)

Empties **every table** of one database: users, sessions, and any table added later. The tables themselves stay, and so does dbmate's list of migrations. Use it to wipe test data, for example before a demo.

**One-time setup:** GitHub → repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

- **Name**: `DATABASE_URL`
- **Secret**: the connection string of the database to clear (for a hosted database, usually ending in `?sslmode=require`)

**To clear:** GitHub → **Actions** → **Clear database** → **Run workflow** → type `CLEAR` → **Run workflow**.

- The log shows only table names, never data.
- Anything other than `CLEAR` stops it without deleting anything.

---

## Git workflow

- `main` is always working. Every change gets its own branch from the latest `main`, then a pull request.
- Merge only when CI is green.

```bash
git checkout main
git pull
git checkout -b feat/something
# ...work, commit...
git push -u origin feat/something
```

---

## Troubleshooting

| Problem                                                 | Fix                                                                                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `turbo: command not found`                              | `pnpm add -g turbo`                                                                                                                                      |
| dbmate: connection refused on `[::1]:5432`              | Start Docker Desktop and `docker compose up -d db`; use `127.0.0.1` in `DATABASE_URL`                                                                    |
| `password authentication failed`                        | `DATABASE_URL` doesn't match `.env`, or the database was created with old values: `docker compose down -v`, then `docker compose up -d db`               |
| Port 5432 already in use                                | Another Postgres is running (another project?): stop it, or change `"5432:5432"` to `"5433:5432"` in `docker-compose.yml` and the port in `DATABASE_URL` |
| `Cannot find module '@talaan/shared'`                   | `turbo run build` (the shared package must be built first)                                                                                               |
| `SESSION_SECRET must be at least 32 characters`         | `openssl rand -hex 32` and paste the result                                                                                                              |
| A 500 error right after pulling new code                | A migration hasn't run: `turbo run db:migrate`                                                                                                           |
| Logged out after every request in Docker or on a server | Plain `http`: set `COOKIE_SECURE=false`; behind a proxy with HTTPS, keep it `true`                                                                       |
| `Set TEST_DATABASE_URL (or DATABASE_URL …)` in tests    | Create `apps/api/.env`, or run tests through `turbo run` (it passes these variables on)                                                                  |
| CI fails but it works on Windows                        | File name case: Linux sees `HomePage.tsx` and `homepage.tsx` as different files                                                                          |
