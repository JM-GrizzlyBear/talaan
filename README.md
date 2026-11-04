# pern-template

A starter for **PostgreSQL, Express, React and Node** apps, built with **Clean Architecture**.

It comes with what almost every app needs (register, log in, log out, protected pages) and one small example feature, **notes**, that goes through every layer: database table, API, React page and tests. To build your own feature, copy how notes work.

---

## What's inside

- **Register, log in, log out**
  - Log in with a username or an email
  - Passwords hashed with bcrypt
  - Sessions stored in Postgres, sent as an HTTP-only cookie
- **Notes (example CRUD)**: create, list, edit and delete. Each user only ever sees and changes their own notes.
- **Protected pages**: logged-out visitors are sent to `/login` and come back after logging in
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

---

## Clean Architecture in 1 minute

_For developers. For everyone else: [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)._

The code is split into four layers. Each layer only uses the layers **inside** it:

```
presentation  →  application  →  domain
      ↓               ↓
infrastructure ───────┘ (implements the interfaces the inner layers define)
```

| Layer              | What lives there                                                         | Knows about Express/Postgres? |
| ------------------ | ------------------------------------------------------------------------ | ----------------------------- |
| **domain**         | Entities (`User`, `Note`), rules, errors, repository **interfaces**      | No                            |
| **application**    | Use cases (`RegisterUser`, `CreateNote`, …) and ports (`PasswordHasher`) | No                            |
| **infrastructure** | The real implementations: Postgres repositories, bcrypt, the clock       | Yes                           |
| **presentation**   | HTTP: routes, middleware, sessions, the error handler                    | Yes                           |

`apps/api/src/buildApp.ts` is the **composition root**: the one place that creates the real classes and hands them to the use cases. That's why the tests can swap in fakes, such as an in-memory repository or a fast password hasher.

What happens when someone saves a note:

```
PUT /api/notes/:id
  → noteRoutes        (presentation: checks the login, validates the body with zod)
  → UpdateNote        (application: "update it, or say it doesn't exist")
  → NoteRepository    (domain interface)
  → PostgresNoteRepository (infrastructure: SQL, filtered by the owner's id)
  ← errorHandler      (presentation: NoteNotFoundError → 404 JSON)
```

The website uses the same idea: `infrastructure/api` (fetch calls) → `application` (TanStack Query hooks) → `presentation` (components and pages).

New to this? The next section explains it with a restaurant and one real example, no coding needed.

---

## Clean Architecture, explained simply (no coding needed)

The section above is the short version for developers. This one explains the same idea for anyone: a manager, a designer, a client, or a developer who's new to it.

### The idea: the app is a restaurant

A restaurant works because everyone has **one job**, and they don't need to know how the others do theirs. The waiter doesn't cook. The chef doesn't care which brand the fridge is. The recipes stay the same if you buy a new oven.

This app is split the same way, into four **layers** (groups of files, each with one job):

| Layer              | In the restaurant, it's…                                                                                      | In this app, it…                                                                                                                                                                                          | Folder                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Domain**         | The **recipe book and the house rules**: what a dish is, what's allowed                                       | Says what a **note** and a **user** are, and the rules: "a note belongs to the person who wrote it", "usernames ignore capital letters"                                                                   | `apps/api/src/domain/`         |
| **Application**    | The **head chef's steps** for each order: "to make a pasta: get the pasta, boil it, add the sauce"            | Has one file per thing a person can do: **register**, **log in**, **create a note**, **edit a note**, **delete a note**                                                                                   | `apps/api/src/application/`    |
| **Infrastructure** | The **equipment**: the fridge, the lock on the door, the wall clock                                           | The real tools: the **PostgreSQL database** (where notes are stored), **bcrypt** (locks passwords), and the **system clock** (tells the time, so the app can limit login attempts to 20 every 15 minutes) | `apps/api/src/infrastructure/` |
| **Presentation**   | The **waiter at the front counter**: takes the order, checks you're a member, brings the plate or the apology | Talks to the outside world over the internet: reads **requests** from the website, checks the login, sends back **answers** like "saved" or "not found"                                                   | `apps/api/src/presentation/`   |

And two helpers:

|                                            | In the restaurant, it's…                                                                   | In this app                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **`buildApp.ts`** (the "composition root") | The **manager on opening day**, who hires everyone and tells each chef which fridge to use | The one file that connects the real tools (database, password lock, clock) to the parts that use them                          |
| **`packages/shared`**                      | The **menu**, read by the customers and the kitchen alike                                  | The rules for forms ("a title is required, at most 120 characters"), used by the website **and** the API, so they always agree |

#### The one rule: the inside never depends on the outside

Picture the layers as rings, with the most important part in the middle:

```
┌──────────────────────────────────────────────────────────────┐
│  PRESENTATION  (the waiter)  ·  INFRASTRUCTURE  (equipment)  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  APPLICATION  (the chef's steps)                       │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  DOMAIN  (the recipes and house rules)           │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Outer rings may use inner rings, never the other way round.** The recipe book (domain) doesn't mention the oven's brand, and the chef's steps (application) say "put it in the fridge", not "put it in the brand X fridge in the corner". So you can change the outside (a new database, a new website, a new way to lock passwords) without rewriting the inside, where the important rules live.

### Follow one action: Maria edits her note

Here's what happens, layer by layer, when Maria changes the title of one of her notes and clicks **Save**. Each step shows the plain-language version and the real (short) piece of code that does it.

```mermaid
flowchart LR
    A["Maria clicks Save<br/>(website)"] --> B["Waiter<br/>noteRoutes<br/>(presentation)"]
    B --> C["Chef's steps<br/>UpdateNote<br/>(application)"]
    C --> D["House rule<br/>NoteRepository<br/>(domain)"]
    D --> E["Fridge<br/>PostgresNoteRepository<br/>(infrastructure)"]
    E --> F[("PostgreSQL<br/>database")]
```

#### 1. On the website: Maria clicks Save

The website is split the same way. The **page** (presentation) only knows "when Save is clicked, update this note". It doesn't know how the internet works.

`apps/web/src/presentation/components/notes/NoteCard.tsx`

```tsx
onSubmit={async (input) => {
  await update.mutateAsync({ id: note.id, input });
```

The **hook** (application) remembers the notes on screen and refreshes them after a save. The **API file** (infrastructure) does the actual internet call:

`apps/web/src/infrastructure/api/notesApi.ts`

```ts
export async function updateNote(id: string, input: NoteInput) {
  const data = await request<{ note: Note }>(`/api/notes/${encodeURIComponent(id)}`, "PUT", input);
```

> 🍽 The customer gives the order to the waiter. They don't walk into the kitchen.

#### 2. Presentation (the waiter): take the order and check it

The request arrives at the server. The **route** checks three things, then hands the order to the chef. It never touches the database itself.

`apps/api/src/presentation/http/routes/noteRoutes.ts` (the numbered comments are added for this guide)

```ts
router.put("/notes/:id", async (req, res) => {
  const id = parseNoteId(req.params.id); // 1. is the note number valid?
  const content = noteInputSchema.parse(req.body); // 2. is the form filled in correctly?
  const note = await deps.updateNote.execute(id, currentUserId(req), content); // 3. who's asking? → the chef
  res.json({ note: noteJson(note) }); // the answer goes back to the website
});
```

(Before this, a gatekeeper called `requireAuth` already checked that Maria is logged in.)

> 🍽 "One carbonara for table 4, member card checked." The waiter doesn't cook.

#### 3. Application (the chef's steps): do it, or say why not

The **use case** is the recipe for this one action, in plain steps. It doesn't know about the internet or SQL.

`apps/api/src/application/note/UpdateNote.ts` (the comments are added for this guide)

```ts
async execute(id: string, userId: string, content: NoteContent) {
  const note = await this.notes.update(id, userId, content);  // "update Maria's note"
  if (!note) throw new NoteNotFoundError();                   // "it isn't there" → say so
  return note;
}
```

> 🍽 "Get the dish ready. If we're out of it, tell the waiter."

#### 4. Domain (the house rules): what a note is, and who may touch it

The **domain** describes the business in its own words. Here it says what a note is made of, and that every way of storing notes **must** check the owner: nobody can edit someone else's note.

`apps/api/src/domain/note/NoteRepository.ts`

```ts
// Every method takes the owner's id: a note can only be read or changed by its owner
export interface NoteRepository {
  update(id: string, userId: string, content: NoteContent): Promise<Note | null>;
```

`apps/api/src/domain/note/errors.ts`

```ts
// Also used for someone else's note, so nobody learns which note ids exist
export class NoteNotFoundError extends Error {
```

An **interface** like `NoteRepository` is a **job description**: "we need someone who can store and find notes, always by owner". It doesn't say how.

> 🍽 House rule: "Each table only gets its own food."

#### 5. Infrastructure (the equipment): actually save it

The **repository** is the one who got the job. It knows SQL and PostgreSQL. Note the `user_id = $2`: the house rule from the domain, done for real.

`apps/api/src/infrastructure/database/PostgresNoteRepository.ts` (the comment is added for this guide)

```sql
update notes set title = $3, body = $4, updated_at = now()
where id = $1 and user_id = $2     -- only Maria's own note
```

> 🍽 The fridge. Any fridge that fits the job description would do.

#### 6. Back to Maria

- **Saved:** the chef returns the note → the waiter sends it back → the page shows the new title.
- **Not hers, or deleted:** the chef raises `NoteNotFoundError` → the waiter's **error handler** turns it into a polite "404: That note doesn't exist":

`apps/api/src/presentation/http/errorHandler.ts`

```ts
if (error instanceof NoteNotFoundError) {
  send(res, 404, { message: error.message });
```

#### Who connects everyone? The manager (`buildApp.ts`)

The chef's steps only know the **job description** (`NoteRepository`). The manager decides who actually does the job, in one place:

`apps/api/src/buildApp.ts`

```ts
const notes = new PostgresNoteRepository(options.pool);   // hire the PostgreSQL "fridge"
updateNote: new UpdateNote(notes),                         // give it to the chef
```

### Why go to all this trouble?

| Without layers                                                                             | With these layers                                                                                                                |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Database code is mixed into every screen. Changing the database means changing everything. | Only `infrastructure/` knows about PostgreSQL. A new database = a new "fridge" file, and the rest stays the same.                |
| To test "a note belongs to its owner", you need a real database running.                   | The tests hand the chef a **pretend** fridge or password lock. Hundreds of checks run in seconds, with no database. (See below.) |
| The same rule ("a title is required") is written in several places, and they drift apart.  | Each rule lives in one place: forms in `packages/shared`, business rules in `domain/`.                                           |
| Hard to know where to look.                                                                | The folder tells you: "it's about the internet" → presentation; "it's a business rule" → domain.                                 |

**A real example of the testing benefit:** passwords are locked with bcrypt, which is slow on purpose. The tests don't want to wait, so they hand `RegisterUser` a **fake lock** that follows the same job description:

`apps/api/test/unit/useCases.test.ts`

```ts
// Fakes: use cases only know the interfaces, so tests can swap in simple in-memory versions
const plainHasher: PasswordHasher = {
  hash: async (password) => `hashed:${password}`,
  compare: async (password, hash) => hash === `hashed:${password}`,
};
```

`RegisterUser` can't tell the difference, because it only knows the job description (`PasswordHasher` in `application/ports/`), not who does it.

### Where does new code go?

Ask these questions in order:

| Question                                                                            | If yes, it goes in… | Example from this repo                                                                                    |
| ----------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------- |
| Is it a **fact or rule of the business** that would be true even without computers? | `domain/`           | "Usernames are compared without capital letters" → `domain/user/rules.ts`                                 |
| Is it **one thing a person can do**, step by step?                                  | `application/`      | "Register: check the name is free, lock the password, save the user" → `application/user/RegisterUser.ts` |
| Does it **talk to a specific tool** (database, email, files, a library)?            | `infrastructure/`   | Storing notes in PostgreSQL → `infrastructure/database/PostgresNoteRepository.ts`                         |
| Is it about **the internet**: addresses, requests, answers, logins?                 | `presentation/`     | The `/api/notes` addresses → `presentation/http/routes/noteRoutes.ts`                                     |
| Is it a **form rule** both the website and the API need?                            | `packages/shared/`  | "A title is required, at most 120 characters" → `packages/shared/src/notes.ts`                            |

To add a whole new feature, follow [Adding a feature (copy the notes)](#adding-a-feature-copy-the-notes): it walks through the layers in this same order.

### Words you'll see

| Word                     | Plain meaning                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| **Layer**                | A group of files with one job (domain, application, infrastructure, presentation).         |
| **Entity**               | A thing the business cares about: a `User`, a `Note`.                                      |
| **Use case**             | One action a person can do: `RegisterUser`, `UpdateNote`. One file each.                   |
| **Interface** / **port** | A job description: "can store notes", "can lock passwords". Says _what_, not _how_.        |
| **Repository**           | The one who stores and finds things (here, in PostgreSQL).                                 |
| **Adapter**              | A real tool that does a job description: `PostgresNoteRepository`, `BcryptPasswordHasher`. |
| **Route**                | An address the website can call, like `PUT /api/notes/:id`.                                |
| **Middleware**           | A gatekeeper every request passes first, like `requireAuth` (are you logged in?).          |
| **Composition root**     | The single place that connects everything: `buildApp.ts`.                                  |
| **Dependency rule**      | Inner rings never use outer rings: the domain doesn't know about the database.             |

---

## Project structure

```
pern-template/
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
│   │   ├── db/migrations/   # SQL migrations (dbmate): users, session, notes
│   │   ├── vitest.config.ts # two test projects: unit and integration
│   │   ├── test/
│   │   │   ├── fixtures/            # test data: users, notes, a fake clock
│   │   │   ├── unit/                # rules, schemas, use cases with fakes (no database)
│   │   │   └── integration/         # real HTTP requests against the test database
│   │   │       └── support/         # test database setup, seed, logged-in test browsers
│   │   └── src/
│   │       ├── domain/              # user/ and note/: entities, rules, errors, repository interfaces
│   │       ├── application/         # user/ and note/ use cases; ports/ (PasswordHasher, Clock)
│   │       ├── infrastructure/      # database/ (Postgres repositories), security/ (bcrypt), time/
│   │       ├── presentation/http/   # routes/, middleware/ (requireAuth, rateLimit), session, errors
│   │       ├── config/env.ts        # reads and checks the environment variables
│   │       ├── buildApp.ts          # composition root (also used by the tests)
│   │       └── main.ts              # starts the server
│   └── web/                 # React website (Vite)
│       ├── vite.config.ts   # dev server: forwards /api to the API on port 4000
│       └── src/
│           ├── infrastructure/api/  # http.ts (fetch + ApiError), authApi, notesApi
│           ├── application/         # auth/ and notes/ hooks (TanStack Query)
│           ├── presentation/
│           │   ├── components/      # layout/, routing/ (RequireAuth, GuestOnly), ui/, notes/
│           │   ├── pages/           # LoginPage, RegisterPage, NotesPage
│           │   └── format/          # dates and error messages (+ tests)
│           ├── test/fixtures/       # test data for the website's tests
│           ├── App.tsx              # routes
│           └── index.css            # Tailwind and the theme colors
└── packages/
    └── shared/              # registerSchema, loginSchema, noteInputSchema, shared types
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

Open http://localhost:5173, create an account, and add a note.

`turbo run dev` shows each app in its own panel: use ↑ / ↓ to switch between `@pern/web#dev` and `@pern/api#dev`. API errors only show in the API panel.

### Option B: run everything in Docker

```bash
docker compose up --build
```

This builds the production image, waits for Postgres, runs the migrations and starts the app on http://localhost:8080. Here the API also serves the website, exactly as it would in production. Stop it with Ctrl+C. `docker compose down` removes the containers but keeps the data; `docker compose down -v` deletes the data too.

### Useful commands

| Command                                                         | What it does                                   |
| --------------------------------------------------------------- | ---------------------------------------------- |
| `turbo run dev`                                                 | API + website with hot reload                  |
| `turbo run build`                                               | Build everything                               |
| `turbo run check-types`                                         | TypeScript checks                              |
| `turbo run lint`                                                | ESLint (website)                               |
| `turbo run test`                                                | All tests                                      |
| `turbo run test:unit`                                           | API unit tests only (no database needed)       |
| `turbo run test:integration`                                    | API integration tests only (needs Postgres)    |
| `turbo run db:migrate`                                          | Apply new migrations                           |
| `turbo run db:rollback`                                         | Undo the last migration                        |
| `turbo run db:new --filter=@pern/api -- create_something_table` | New migration file in `apps/api/db/migrations` |
| `pnpm format`                                                   | Format every file with Prettier                |
| `docker compose up -d db`                                       | Start only Postgres                            |
| `docker compose up --build`                                     | Run the whole app in Docker on :8080           |

---

## Environment files

`.env` files are in `.gitignore`. **Never commit them**, only the `.env.example` files.

### Root `.env` (used by docker compose)

| Variable            | Example                | Meaning                                          |
| ------------------- | ---------------------- | ------------------------------------------------ |
| `POSTGRES_USER`     | `app`                  | Database user created by Docker                  |
| `POSTGRES_PASSWORD` | `pick_a_password`      | Its password (letters, numbers, `_`; no `@ : /`) |
| `POSTGRES_DB`       | `app`                  | Database name                                    |
| `SESSION_SECRET`    | `openssl rand -hex 32` | Only for Option B (the app container)            |

### `apps/api/.env` (used by the API and dbmate)

| Variable         | Required | Example / meaning                                                                    |
| ---------------- | -------- | ------------------------------------------------------------------------------------ |
| `PORT`           | no       | `4000`                                                                               |
| `DATABASE_URL`   | yes      | `postgres://app:pick_a_password@127.0.0.1:5432/app?sslmode=disable` (same as `.env`) |
| `SESSION_SECRET` | yes      | at least 32 random characters: `openssl rand -hex 32`                                |
| `COOKIE_SECURE`  | no       | `true` in production by default (HTTPS-only cookie); `false` for plain http          |
| `WEB_DIST_DIR`   | no       | Set by the Docker image: the built website the API should serve                      |

Use `127.0.0.1` instead of `localhost` in `DATABASE_URL` on Windows if dbmate says the connection was refused on `[::1]:5432`.

---

## How login works

1. **Register** (`POST /api/auth/register`): the API checks the form with `registerSchema` and stores the username and email in lowercase. It hashes the password with bcrypt (12 rounds) and logs the new user in.
2. **Log in** (`POST /api/auth/login`): the username or email and the password are checked. A wrong password and an unknown user get the **same** answer, so nobody can find out which accounts exist.
3. **Logging in starts a brand-new session.** The session is a row in the `session` table, and the browser gets an `app.sid` cookie:
   - `HttpOnly`: the page's JavaScript can't read it
   - `SameSite=Lax`
   - `Secure` in production: it's only sent over HTTPS
4. **Protected API routes** use the `requireAuth` middleware and read the user's id from the session.
5. **Log out** (`POST /api/auth/logout`) deletes the session row, so the old cookie stops working.
6. **Rate limit**: 20 login or register tries per visitor every 15 minutes (in memory). The limit is in `buildApp.ts`.

On the website, `useCurrentUser()` asks `GET /api/auth/me` once and every page shares that answer. `RequireAuth` protects pages, and `GuestOnly` sends logged-in users away from the login and register pages.

---

## API overview

All routes start with `/api`. Errors always look like `{ "message": "…", "errors": { "field": ["…"] } }`.

| Method | Route                | Login? | What                                                        |
| ------ | -------------------- | ------ | ----------------------------------------------------------- |
| GET    | `/api/health`        | no     | `{ ok: true }` when the API can reach the database          |
| POST   | `/api/auth/register` | no     | `{ username, email, password }` → 201 `{ user }`, logged in |
| POST   | `/api/auth/login`    | no     | `{ login, password }` → `{ user }`                          |
| GET    | `/api/auth/me`       | yes    | `{ user }`, or 401                                          |
| POST   | `/api/auth/logout`   | no     | 204                                                         |
| GET    | `/api/notes`         | yes    | `{ notes }`, newest change first                            |
| POST   | `/api/notes`         | yes    | `{ title, body? }` → 201 `{ note }`                         |
| GET    | `/api/notes/:id`     | yes    | `{ note }`, or 404                                          |
| PUT    | `/api/notes/:id`     | yes    | `{ title, body? }` → `{ note }`                             |
| DELETE | `/api/notes/:id`     | yes    | 204                                                         |

Someone else's note answers **404**, the same as a note that doesn't exist.

| Status | When                                                        |
| ------ | ----------------------------------------------------------- |
| 400    | The form didn't pass validation (`errors` says which field) |
| 401    | Not logged in, or wrong login                               |
| 404    | Not found (or not yours)                                    |
| 409    | Username or email already taken                             |
| 429    | Too many login or register tries                            |

---

## Adding a feature (copy the notes)

Say you want **tasks**. Follow the notes files one by one:

1. **Migration**: `turbo run db:new --filter=@pern/api -- create_tasks_table`, write the `create table` (with `user_id … references users (id) on delete cascade`), then `turbo run db:migrate`.
2. **Shared**: `packages/shared/src/tasks.ts` with a zod `taskInputSchema` and a `Task` type, exported from `index.ts`.
3. **Domain**: `apps/api/src/domain/task/` with `Task.ts`, the `TaskRepository` interface and `errors.ts`.
4. **Application**: one use case per action in `apps/api/src/application/task/` (`ListTasks`, `CreateTask`, …).
5. **Infrastructure**: `PostgresTaskRepository.ts`. Filter every query by `user_id`.
6. **Presentation**:
   - `routes/taskRoutes.ts`, with `requireAuth` and `taskInputSchema.parse(req.body)`
   - map new errors in `errorHandler.ts`
   - add a `taskJson` in `toJson.ts`
7. **Wire it up**: in `buildApp.ts`, create the repository and use cases and mount `taskRoutes`.
8. **Website**:
   - `infrastructure/api/tasksApi.ts`
   - `application/tasks/useTasks.ts`
   - a page in `presentation/pages/`
   - a route in `App.tsx`, inside `<RequireAuth />`
9. **Tests**:
   - fixtures in `test/fixtures/`
   - a unit test for the rules
   - an integration test like `notes.test.ts`
   - add the new table to the `truncate` in `test/integration/support/seed.ts`

---

## Tests

```bash
docker compose up -d db
turbo run test
```

| Suite           | Where                       | What it checks                                                                        |
| --------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| API unit        | `apps/api/test/unit`        | User rules, shared schemas, use cases with fake repositories (no database)            |
| API integration | `apps/api/test/integration` | Register, login, logout, sessions, rate limit, notes CRUD, other users' notes, errors |
| Website unit    | `apps/web/src/**/*.test.ts` | The API client (`ApiError`), error messages, dates                                    |

### The test database

The integration tests **never touch your real data**:

- They use your `DATABASE_URL` database name plus `_test` (`app` → `app_test`), or `TEST_DATABASE_URL` if set.
- dbmate creates it if needed and applies every migration before the tests run.
- **Before every test**, all tables are emptied and the same seed data goes back in, so every test starts from the same state:
  - users `maria` and `ana` (password `password123`)
  - one note for Maria
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

Empties **every table** of one database: users, sessions, notes, and any table you add later. The tables themselves stay, and so does dbmate's list of migrations. Use it to wipe test data, for example before sharing a live app.

**One-time setup:** GitHub → repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

- **Name**: `DATABASE_URL`
- **Secret**: the connection string of the database to clear (for a hosted database, usually ending in `?sslmode=require`)

**To clear:** GitHub → **Actions** → **Clear database** → **Run workflow** → type `CLEAR` → **Run workflow**.

- The log shows only table names, never data.
- Anything other than `CLEAR` stops it without deleting anything.

---

## Starting a new project from this template

1. On GitHub, click **Use this template** → **Create a new repository**. To get that button, tick **Settings** → **Template repository** in this repo first.
2. Clone it, then rename the bits that say "pern":
   - `@pern/api`, `@pern/web` and `@pern/shared` in the three `package.json` files, and in the imports (search for `@pern/`)
   - the session cookie name in `apps/api/src/presentation/http/session.ts` (`SESSION_COOKIE`)
   - the title in `apps/web/index.html` and the name in `AppHeader.tsx`
   - the colors in `apps/web/src/index.css` (the `@theme` block)
3. `pnpm install` (this updates `pnpm-lock.yaml` after renaming), then follow [Run it locally](#run-it-locally).
4. Keep notes as a reference while you build your first feature, then delete it:
   - its migration (or add a new migration that drops the table)
   - the `note` folders
   - `noteRoutes`, `useNotes` and `NotesPage`
   - its tests and fixtures

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
| `Cannot find module '@pern/shared'`                     | `turbo run build` (the shared package must be built first)                                                                                               |
| `SESSION_SECRET must be at least 32 characters`         | `openssl rand -hex 32` and paste the result                                                                                                              |
| A 500 error right after pulling new code                | A migration hasn't run: `turbo run db:migrate`                                                                                                           |
| Logged out after every request in Docker or on a server | Plain `http`: set `COOKIE_SECURE=false`; behind a proxy with HTTPS, keep it `true`                                                                       |
| `Set TEST_DATABASE_URL (or DATABASE_URL …)` in tests    | Create `apps/api/.env`, or run tests through `turbo run` (it passes these variables on)                                                                  |
| CI fails but it works on Windows                        | File name case: Linux sees `NoteCard.tsx` and `notecard.tsx` as different files                                                                          |
