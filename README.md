# Talaan

Every X-ray, lab result and prescription for your family, and where the paper is.

Scan or upload a record, keep each X-ray film together with its reading, and note which folder, box or bag holds the original. QR labels on the folders tell you what should be inside, and Talaan reminds you when a follow-up is due and shows how your lab numbers compare over time. It works on the web, iPhone, iPad and Android, all on one account.

_Talaan_ is Filipino for "record" or "list".

> **Status:** starting point. This repo has the base (sign in, sign out, protected pages, tests, Docker, CI). The features below are being built next.

---

## What's planned

- **Records:** X-rays, lab results, prescriptions, HMO approvals (LOA) and other papers, for each family member, with a timeline and filters.
- **Scan and upload:** photos or PDFs go straight to private storage; Talaan reads the lab numbers (done) and later the date, doctor and hospital, so you only check them.
- **X-ray with its reading:** the film photos and the radiologist's reading are one record.
- **Places and QR labels** (done): folders, boxes, envelopes, drawers and bags, each with its own QR label. Print sheets of labels (including blank ones to name later) and scan a label to see what should be inside.
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

- **Accounts**
  - Sign up with your first name, middle name (optional), last name, email, a password of at least 10 characters, and the privacy consent (the time it was given is saved)
  - Sign in with your email; passwords hashed with bcrypt
  - Sessions stored in Postgres, sent as an HTTP-only cookie
- **Two-step sign-in** (on for new accounts): on a browser Talaan doesn't know yet, the password is followed by a 6-digit code from email. "Remember this browser" skips the code there for 30 days. Turning it off needs the password.
- **Passkeys**: add one on the Security page, then sign in or unlock with Face ID, a fingerprint, Windows Hello or the phone's PIN. No password, no code. Talaan keeps only the public key.
- **Records**: 8 types (X-ray / imaging, lab result, prescription, consultation, medical certificate, vaccination, HMO / billing, other), for you or a family profile
  - Each has a title, date, doctor, clinic or hospital, and notes; plus lab results (test, result, unit, normal range, with Low/High flags), medicines (name, dose, how often), the X-ray reading, the vaccine and dose, or the HMO, LOA number and amounts (total, HMO covered, you paid)
  - A list per account and person, filtered by type; a page per record
  - **Who can do what**: the owner does everything; "Can manage" family add, edit and move to the Trash; "Can view" family only look
  - **Trash**: records stay 30 days, then Talaan deletes them for good (hourly, and whenever the Trash is opened). Only the owner restores or deletes sooner.
  - **Audit trail**: every add, edit (with each changed field, before and after), move to the Trash, restore and delete is saved with who did it and when. Sharing changes (invitations, accepting, access changes, profiles) are too. Each record shows its history; the owner's Activity page shows everything. Entries can't be changed, not even directly in the database.
- **Photos and PDFs on records**: up to 20 per record, 10 MB each (JPG, PNG, WEBP, HEIC, PDF). "Take a photo" opens the phone's camera. Files are private in Cloudinary: the browser only ever gets them through the API, after the same "who can see this record" check. Removing a file, or deleting its record for good, removes it from Cloudinary too.
- **Read lab results from a photo or PDF** (free, on the device): on a lab result, **Read from a photo or PDF**, or **Read lab values from this** on a file already attached. Talaan finds each test, result, unit and normal range; you check every row beside the picture (unclear ones are marked in amber) before they go into the form, and nothing is saved until you press Save. See [Reading lab results](#reading-lab-results-from-a-photo-or-pdf).
- **Places and QR labels**: where the papers and films are kept at home
  - A place is a folder, envelope, box, drawer, cabinet or shelf, bag, or other, with a name, a note and an optional photo of where it is. Places go inside places, up to 3 levels (a folder in a box in a drawer).
  - A record can be kept in a place ("Where it's kept"); the record shows the way there (Drawer › Blue box › Folder) and the place lists its records and the places inside it.
  - Each place has a QR label with a random code like `7K4Q-M2XD` (no look-alike letters, so it can be typed too). Scanning it with any phone camera opens the place, after signing in; anyone the account isn't shared with gets "not found".
  - **Printing**: pick places (and copies), and new **blank labels** to stick on now and name the first time they're scanned. Paper: A4, Short / Letter, Long / Folio, Legal, A5, A3, B5, Half letter, 4 × 6 photo paper or a custom size. Labels: Large 99 × 67, Medium 70 × 37, Small 52 × 30, Tiny 38 × 21 mm (QR and code only) or a custom size; the page says how many fit. Margin for plain paper or none for sticker sheets, skip the spaces already used on a sheet, and cut lines. The QR codes are made in the browser (no outside service).
  - Owners and "Can manage" family add, edit, move, add photos and name blank labels; only the owner removes a place. Removing one loses nothing: what's inside moves up a level and its label becomes blank. All of it is in the audit trail.
- **Family** (one way: the people you invite see your records, not the other way round)
  - Invite by email with who they are to you (Anak, Nanay, Lolo, …) and what they can do: **Can view** (records and lab comparisons) or **Can manage** (also add records, scan and set reminders). Invitations last 7 days; send again or cancel any time.
  - The invited person accepts or declines from the email's link. Declining needs no account; accepting needs a Talaan account with that same email (a new account can be made on the way).
  - Change what someone can do, remove them, or stop seeing someone else's records
  - **Family without email**: profiles for a child or a lolo without a phone, kept under your account (name, who they are to you, optional birthday)
- **Forgot password**: a 6-digit code by email (15 minutes, 3 tries, only a keyed hash is stored), then a new password; every device is signed out and a "password changed" email is sent
- **Lock after idle time**: the website locks after 5, 15, 30 or 60 minutes with nobody using it (15 by default). The password unlocks it; the API enforces the lock too.
- **Security page**: passkeys (add, remove), two-step sign-in on or off, the lock time, lock now, change the password, remembered browsers (forget one or all), and "Sign out everywhere else"
- **Protection**: separate rate limits for sign-in, unlock, password reset and codes per email; security headers (helmet); the same answers whether or not an email has an account
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
| Email    | nodemailer: Mailpit locally, Brevo on the live site                       |
| Security | helmet (security headers), rate limits, HMAC-hashed reset codes           |
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

`apps/api/src/buildApp.ts` and `apps/api/src/composition/` are the **composition root**: the one place that creates the real classes and hands them to the use cases (one file per area: `accountsModule.ts`, `familyModule.ts`, `recordsModule.ts`, plus `repositories.ts` and `rateLimits.ts`). That's why the tests can swap in fakes, such as an in-memory repository or a fast password hasher.

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

On the website, a page in `pages/<feature>/` stays short: it loads data and puts components from `components/<feature>/` together. A piece used by more than one feature (a heading, a badge, the "Yes / Keep" confirm, the back link) goes in `components/ui/`.

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
│   │   ├── db/migrations/   # SQL migrations (dbmate): users, session, codes, passkeys, remembered browsers, family, records, the audit log and record files
│   │   ├── vitest.config.ts # two test projects: unit and integration
│   │   ├── test/
│   │   │   ├── fixtures/            # test data: users, a fake clock, fake emails, a fake passkey device
│   │   │   ├── unit/                # rules, schemas, use cases with fakes (no database)
│   │   │   └── integration/         # real HTTP requests against the test database
│   │   │       └── support/         # test database setup, seed, logged-in test browsers
│   │   └── src/
│   │       ├── domain/              # user/, emailCode/, passkey/, trustedBrowser/, family/, record/, audit/: entities, rules, errors, repository interfaces
│   │       ├── application/         # use cases: user/, passwordReset/, twoStep/, passkey/, family/, record/, audit/; ports/ (PasswordHasher, Clock, PasskeyCeremonies, …)
│   │       ├── infrastructure/      # database/ (Postgres repositories), security/ (bcrypt, HMAC), email/, webauthn/, time/
│   │       ├── presentation/http/   # routes/ (one file per feature), json/ (what the browser receives), middleware/, session, errors
│   │       ├── config/env.ts        # reads and checks the environment variables
│   │       ├── composition/         # wiring per area (accounts, family, records), repositories, rate limits
│   │       ├── buildApp.ts          # composition root (also used by the tests)
│   │       └── main.ts              # starts the server
│   └── web/                 # React website (Vite)
│       ├── public/          # favicon and app icons (the Talaan logo); reader/ is copied there (not in git)
│       ├── scripts/         # copy-reader-files.mjs: puts the lab reader's files in public/reader/
│       ├── vite.config.ts   # dev server: forwards /api to the API on port 4000
│       └── src/
│           ├── infrastructure/      # api/ (fetch + ApiError, authApi, accountApi), passkeys/ (the device prompt), reader/ (photo/ and pdf/: text from photos and PDFs)
│           ├── application/         # auth/, family/ and records/ hooks (TanStack Query); reader/ (reading a lab result step by step)
│           ├── presentation/
│           │   ├── components/      # per feature: auth/, family/, records/ (form/, view/, files/, reader/ with steps/ and check/), security/; plus brand/, layout/, routing/, ui/ (shared pieces)
│           │   ├── pages/           # auth/, records/, family/, settings/: short pages that put components together
│           │   └── format/          # dates, ages, history sentences, error messages, passkey names (+ tests)
│           ├── App.tsx              # routes
│           └── index.css            # Tailwind and the theme colors
└── packages/
    └── shared/              # form rules and types used by both: auth/, family/, records/, scan/ (lab line reader, one step per file; tests/ lists the known lab tests), files, audit
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
docker compose up -d db mail # Postgres, and Mailpit to catch emails
turbo run build              # builds the shared package
turbo run db:migrate         # creates the tables
turbo run dev                # API on :4000, website on :5173
```

Open http://localhost:5173, create an account, and you'll see the Talaan welcome page. Emails (like the Forgot password code) don't leave your computer: read them in Mailpit at http://localhost:8025.

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

| Variable            | Example                | Meaning                                            |
| ------------------- | ---------------------- | -------------------------------------------------- |
| `POSTGRES_USER`     | `talaan`               | Database user created by Docker                    |
| `POSTGRES_PASSWORD` | `pick_a_password`      | Its password (letters, numbers, `_`; no `@ : /`)   |
| `POSTGRES_DB`       | `talaan`               | Database name                                      |
| `POSTGRES_PORT`     | `5432`                 | Port on your computer; use `5433` if 5432 is taken |
| `SESSION_SECRET`    | `openssl rand -hex 32` | Only for Option B (the app container)              |

### `apps/api/.env` (used by the API and dbmate)

| Variable          | Required  | Example / meaning                                                                                                              |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`            | no        | `4000`                                                                                                                         |
| `DATABASE_URL`    | yes       | `postgres://talaan:pick_a_password@127.0.0.1:5432/talaan?sslmode=disable` (same as `.env`)                                     |
| `SESSION_SECRET`  | yes       | at least 32 random characters: `openssl rand -hex 32`                                                                          |
| `COOKIE_SECURE`   | no        | `true` in production by default (HTTPS-only cookie); `false` for plain http                                                    |
| `WEB_DIST_DIR`    | no        | Set by the Docker image: the built website the API should serve                                                                |
| `TRUST_PROXY`     | no        | How many proxies sit in front: `0` locally, `1` behind Render, `2` behind Netlify → Render                                     |
| `SMTP_HOST`       | no        | Turns email on. `127.0.0.1` (Mailpit) locally, `smtp-relay.brevo.com` live                                                     |
| `SMTP_PORT`       | no        | `1025` (Mailpit), `2525` on Render (its free plan blocks 25, 465 and 587)                                                      |
| `SMTP_USER`       | no        | Brevo's SMTP login (looks like `xxxxxx@smtp-brevo.com`). Empty for Mailpit                                                     |
| `SMTP_PASS`       | no        | Brevo's SMTP key. Empty for Mailpit. Only in your `.env` or Render's settings                                                  |
| `MAIL_FROM`       | with SMTP | `Talaan <your-new-sender@gmail.com>`, a sender verified on Brevo                                                               |
| `APP_URL`         | live site | The website's address: links in emails, and passkeys belong to it. Defaults to `http://localhost:5173`; required in production |
| `WEBAUTHN_RP_ID`  | no        | Overrides the passkey domain (normally the host of `APP_URL`, like `talaan.netlify.app`)                                       |
| `WEBAUTHN_ORIGIN` | no        | Overrides the passkey origin (normally `APP_URL` without a path)                                                               |

| `CLOUDINARY_URL` | live site | Where photos and PDFs go: `cloudinary://<api key>:<api secret>@<cloud name>` (README → "Storing photos and PDFs"). Locally, leave it empty to use `apps/api/.uploads` |
| `CLOUDINARY_FOLDER` | no | The top folder in Cloudinary: `talaan-dev` on your computer, `talaan` (the default) live |
| `LOCAL_UPLOADS_DIR` | no | Where uploads go without Cloudinary (default `.uploads`, inside `apps/api`) |

Without `SMTP_HOST`, everything works except Forgot password and family invitations, which answer that email isn't set up yet, and two-step sign-in, which is skipped (nobody gets locked out of their account).

Passkeys only work on the exact address in `APP_URL`. A passkey made on `http://localhost:5173` won't work on the live site, and the other way round. If you change the live address (for example a custom domain), people add their passkeys again.

Use `127.0.0.1` instead of `localhost` in `DATABASE_URL` on Windows if dbmate says the connection was refused on `[::1]:5432`.

---

## How sign-in works

1. **Sign up** (`POST /api/auth/register`): the API checks the form with `registerSchema` (first name, optional middle name, last name, email, password of at least 10 characters, and `consent: true`). It stores the email in lowercase, saves when the privacy consent was given, hashes the password with bcrypt (12 rounds) and signs the new person in.
2. **Sign in** (`POST /api/auth/login`): the email and password are checked. A wrong password and an unknown email get the **same** answer, so nobody can find out which accounts exist.
   - **Two-step**: when it's on and this browser isn't remembered, the answer is **202** `{ twoStep: true, email: "m•••a@example.com" }` and a 6-digit code is emailed. Nobody is signed in yet; the session only holds who is waiting for a code (15 minutes). `POST /api/auth/login/code` with the code signs in. Codes follow the Forgot password rules (15 minutes, 3 tries, HMAC-hashed) in their own table, `sign_in_codes`.
   - **Remember this browser**: the browser gets a `talaan.tb` cookie (`HttpOnly`, `SameSite=Lax`, path `/api`, 30 days) holding a row id and a 256-bit random token; only a SHA-256 of the token is stored in `trusted_browsers`. A new password, "Forget", or 30 days ends it.
   - **Passkeys** (WebAuthn, with `@simplewebauthn/server` and `@simplewebauthn/browser`): the API makes a one-time challenge and keeps it in the session for 5 minutes, the device signs it after Face ID, a fingerprint or its PIN, and the API checks the signature with the stored public key and that the key's counter went up. Talaan always asks for that check (`userVerification: "required"`), and passkeys are discoverable, so signing in needs no email. A passkey skips the emailed code: it's already something you have (the device) and something you are or know (face, finger, PIN).
3. **Signing in starts a brand-new session.** The session is a row in the `session` table, and the browser gets a `talaan.sid` cookie:
   - `HttpOnly`: the page's JavaScript can't read it
   - `SameSite=Lax`
   - `Secure` in production: it's only sent over HTTPS
4. **Protected API routes** use the `requireAuth(clock)` middleware and read the user's id from the session.
5. **Idle lock**: the session remembers when this browser last used the API. After the person's chosen minutes (5, 15, 30 or 60) with nothing, protected routes answer **423 Locked** until `POST /api/auth/unlock` gets the right password (or `POST /api/auth/unlock/passkey` one of that person's passkeys). The website also watches for clicks, typing and scrolling: it locks itself after the same time, and while someone is reading it tells the API every 2 minutes (`POST /api/auth/activity`) so the API doesn't lock them out.
6. **Forgot password** (3 steps): `request` emails a 6-digit code, `check` tests it, `complete` saves the new password. Codes last 15 minutes and 3 wrong tries; asking again replaces the old code. Only an HMAC of the code (keyed with `SESSION_SECRET` and the account id) is stored. A new password signs out every device and sends a "password changed" email.
7. **Family invitations**: `POST /api/family/invitations` stores the invitation with a SHA-256 of a random 256-bit token and emails the link `APP_URL/invite/<token>`. The website sends the token back in the request **body** (not the address), so it stays out of server logs. Accepting needs the token (it proves the person can read that inbox) **and** a signed-in account whose email is the invited one, because emails aren't verified at sign-up. Access is one row per owner → member in `family_access`; `FamilyMembers.roleFor(viewer, owner)` answers "owner", "manage", "view" or nothing, for the records features to use.
8. **Records and the audit trail**: every record route checks `FamilyMembers.roleFor` first. Someone a record isn't shared with gets 404 (they don't learn it exists); "Can view" family get 403 for changes. Edits compare old and new fields (`diffRecords` in `domain/record/rules.ts`) and save only real changes. The `audit_log` table keeps the actor's name at the time and isn't tied to the record, so the history outlives a deleted record. A database trigger refuses any `UPDATE` on it.
9. **Sign out** (`POST /api/auth/logout`) deletes the session row, so the old cookie stops working. It works while locked too.
10. **Rate limits** (in memory, per 15 minutes, in `composition/rateLimits.ts`): 20 sign-in/sign-up tries per visitor, 20 unlock and password-change tries per person, 20 reset steps per visitor, 3 codes per email address, 3 new sign-in codes per person waiting for one, 3 family invitations per email address (and per invitation) a day, and 300 record changes per person. Each has its own counter, because a family at home shares one IP address.

On the website, `useSession()` asks `GET /api/auth/me` once and every page shares that answer (`{ user, locked }`). `RequireAuth` protects pages and shows the lock screen when locked. Any 423 answer also switches to the lock screen. `GuestOnly` sends signed-in people away from the sign-in and sign-up pages.

---

## Sending emails (Brevo)

Forgot-password codes and "password changed" notices are real emails on the live site. Talaan uses its own sender address:

1. **Create the sender Gmail** for Talaan (for example `talaan.app@gmail.com`).
2. **Sign up at [brevo.com](https://www.brevo.com)** (the free plan sends 300 emails a day) with that Gmail.
3. **Verify the sender**: Brevo → _Senders, Domains & Dedicated IPs_ → _Senders_ → _Add a sender_ → that Gmail, then click the link Brevo emails you.
4. **Get the SMTP login**: Brevo → _SMTP & API_ → _SMTP_ tab. Copy the **Login** (looks like `xxxxxx@smtp-brevo.com`), then _Generate a new SMTP key_ and copy it once (it's only shown once).
5. **Put them in Render** (your service → _Environment_), never in the code:

   | Variable    | Value                                     |
   | ----------- | ----------------------------------------- |
   | `SMTP_HOST` | `smtp-relay.brevo.com`                    |
   | `SMTP_PORT` | `2525`                                    |
   | `SMTP_USER` | the Login from step 4                     |
   | `SMTP_PASS` | the SMTP key from step 4                  |
   | `MAIL_FROM` | `Talaan <the Gmail you verified>`         |
   | `APP_URL`   | your website's address, no `/` at the end |

6. **Test it**: open Forgot password on the live site, enter your own email, and check the inbox (and the spam folder the first time).

Gmail may put the first emails in spam because they come through Brevo. Marking one as "Not spam" usually fixes it.

---

## Storing photos and PDFs (Cloudinary)

Talaan keeps photos and PDFs on [Cloudinary](https://cloudinary.com). Without it, your computer keeps them in `apps/api/.uploads`, and the live site has no uploads.

**How it's private:** files are uploaded as **authenticated** assets, which have no public link. The browser uploads straight to Cloudinary with a one-time signature from the API (so big files don't pass through the API), and the API checks Cloudinary's signed answer before attaching the file. To show a file, the API checks who's asking, then fetches it from Cloudinary with a signed address and streams it back. The browser never sees a Cloudinary address.

1. **Get the API environment variable.** Sign in at https://console.cloudinary.com → **Settings** (the gear) → **API Keys**. Click **Generate New API Key** and name it `Talaan`, so it can be switched off on its own later. Copy the **API environment variable** at the top and put that key's id and secret in it: `cloudinary://<api key>:<api secret>@<cloud name>`.
2. **On your computer:** in `apps/api/.env`, set `CLOUDINARY_URL=` to that value and `CLOUDINARY_FOLDER=talaan-dev`. Restart `turbo dev`. The API prints `Uploads go to Cloudinary (<cloud name>, folder talaan-dev)`.
3. **On the live site** (Render → Environment): `CLOUDINARY_URL` (the same value), and leave `CLOUDINARY_FOLDER` out (it defaults to `talaan`), so testing and real files stay apart.
4. **Lock it down** (Settings → **Security**):
   - Turn on **Strict transformations**. Talaan signs every address, so nobody can ask Cloudinary for other sizes or versions of a file.
   - Leave **Restricted media types** as they are. Talaan shows a PDF icon instead of a PDF thumbnail; if PDFs won't open at all, turn on delivery of PDF files there.
   - Don't create an **unsigned upload preset**: it would let anyone upload into your account. Talaan doesn't need one.
5. **Check it:** add a record, then **Add photos or PDFs**. In Cloudinary → **Media Library**, the file is under `talaan-dev/<account id>/<record id>/`, marked as authenticated.

The API secret is like a password: keep it only in `apps/api/.env` and Render's settings. If it leaks, delete that API key in Cloudinary and generate a new one. Cloudinary's free plan has a monthly allowance; the Dashboard shows how much is used.

---

## API overview

All routes start with `/api`. Errors always look like `{ "message": "…", "errors": { "field": ["…"] } }`.

| Method | Route                                  | Login? | What                                                                                                                   |
| ------ | -------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health`                          | no     | `{ ok: true }` when the API can reach the database                                                                     |
| POST   | `/api/auth/register`                   | no     | `{ firstName, middleName, lastName, email, password, consent: true }` → 201 `{ user }`, signed in                      |
| POST   | `/api/auth/login`                      | no     | `{ email, password }` → `{ twoStep: false, user }`, or 202 `{ twoStep: true, email }`                                  |
| POST   | `/api/auth/login/code`                 | no     | `{ code, rememberBrowser }` → `{ user }`, signed in                                                                    |
| POST   | `/api/auth/login/resend`               | no     | 204; emails a new sign-in code                                                                                         |
| POST   | `/api/auth/passkey/options`            | no     | The passkey prompt for the browser                                                                                     |
| POST   | `/api/auth/passkey/verify`             | no     | `{ response }` → `{ user }`, signed in                                                                                 |
| GET    | `/api/auth/me`                         | yes    | `{ user, locked }`, or 401                                                                                             |
| POST   | `/api/auth/activity`                   | yes    | 204; keeps the session from locking                                                                                    |
| POST   | `/api/auth/lock`                       | yes    | 204; "Lock Talaan now"                                                                                                 |
| POST   | `/api/auth/unlock`                     | yes    | `{ password }` → `{ user }`                                                                                            |
| POST   | `/api/auth/unlock/passkey/options`     | yes    | The passkey prompt, only this person's passkeys                                                                        |
| POST   | `/api/auth/unlock/passkey`             | yes    | `{ response }` → `{ user }`                                                                                            |
| POST   | `/api/auth/logout`                     | no     | 204                                                                                                                    |
| POST   | `/api/auth/password-reset/request`     | no     | `{ email }` → 202, the same answer for every email                                                                     |
| POST   | `/api/auth/password-reset/check`       | no     | `{ email, code }` → 204                                                                                                |
| POST   | `/api/auth/password-reset/complete`    | no     | `{ email, code, password }` → 204, every device signed out                                                             |
| GET    | `/api/family`                          | yes    | `{ members, invitations, profiles, sharedWithMe }`                                                                     |
| POST   | `/api/family/invitations`              | yes    | `{ email, relationship, access }` → 201; emails the link                                                               |
| POST   | `/api/family/invitations/:id/resend`   | yes    | 204; a new link and 7 more days                                                                                        |
| DELETE | `/api/family/invitations/:id`          | yes    | 204; cancels a waiting one or clears a declined one                                                                    |
| POST   | `/api/family/invitations/lookup`       | no     | `{ token }` → who invited, as what, the status, and `forThisAccount`                                                   |
| POST   | `/api/family/invitations/accept`       | yes    | `{ token }` → 204; needs the invited email's account                                                                   |
| POST   | `/api/family/invitations/decline`      | no     | `{ token }` → 204                                                                                                      |
| PUT    | `/api/family/members/:userId`          | yes    | `{ access }` → 204                                                                                                     |
| DELETE | `/api/family/members/:userId`          | yes    | 204; stop sharing with them                                                                                            |
| DELETE | `/api/family/shared/:ownerId`          | yes    | 204; stop seeing their records                                                                                         |
| POST   | `/api/family/profiles`                 | yes    | `{ firstName, middleName, lastName, relationship, birthDate }` → 201 `{ profile }`                                     |
| PUT    | `/api/family/profiles/:id`             | yes    | same fields → `{ profile }`                                                                                            |
| DELETE | `/api/family/profiles/:id`             | yes    | 204                                                                                                                    |
| GET    | `/api/records/accounts`                | yes    | Accounts you can open (yours and shared ones), your role in each, and their people                                     |
| GET    | `/api/records`                         | yes    | `?ownerId=&profileId=self\|<id>&type=&placeId=` → `{ role, records }`, newest first                                    |
| POST   | `/api/records`                         | yes    | `{ ownerId, type, profileId, title, recordDate, doctor, facility, notes, details }` → 201 `{ record }`                 |
| GET    | `/api/records/:id`                     | yes    | `{ record }` with `role`                                                                                               |
| PUT    | `/api/records/:id`                     | yes    | same fields → `{ record }` (owner or "Can manage")                                                                     |
| DELETE | `/api/records/:id`                     | yes    | 204; moves it to the Trash (owner or "Can manage")                                                                     |
| GET    | `/api/records/trash`                   | yes    | Your Trash (owner only), with who moved each and when it's deleted for good                                            |
| DELETE | `/api/records/trash`                   | yes    | `{ deleted }`; empties your Trash                                                                                      |
| POST   | `/api/records/:id/restore`             | yes    | 204 (owner only)                                                                                                       |
| DELETE | `/api/records/:id/forever`             | yes    | 204; only from the Trash (owner only)                                                                                  |
| GET    | `/api/records/:id/history`             | yes    | `{ entries }`: who did what, with the changed fields                                                                   |
| GET    | `/api/activity`                        | yes    | `?before=` → `{ entries, next }`: your account's history, 50 at a time                                                 |
| GET    | `/api/records/:id/files`               | yes    | `{ files }`: name, format, size, who added it                                                                          |
| POST   | `/api/records/:id/files/upload-target` | yes    | Where to send one file (signed; Cloudinary or the local folder)                                                        |
| POST   | `/api/records/:id/files`               | yes    | `{ upload, name }` → 201 `{ file }`: checks the upload's answer, then attaches it                                      |
| GET    | `/api/files/:id/content`               | yes    | `?variant=thumb\|preview\|original&download=1`: the file itself, after the access check                                |
| DELETE | `/api/files/:id`                       | yes    | 204; removes it from the record and from storage                                                                       |
| GET    | `/api/places`                          | yes    | `?ownerId=` → `{ role, places }`: each with its label code and what's inside                                           |
| POST   | `/api/places`                          | yes    | `{ ownerId, kind, name, note, parentId }` → 201 `{ place }` (owner or "Can manage"; at most 3 levels)                  |
| GET    | `/api/places/:id`                      | yes    | `{ place }` with the way there (`path`), the places inside it and `role`                                               |
| PUT    | `/api/places/:id`                      | yes    | same fields → `{ place }` (owner or "Can manage")                                                                      |
| DELETE | `/api/places/:id`                      | yes    | 204 (owner only); what's inside moves up, its label becomes blank                                                      |
| POST   | `/api/places/:id/photo/upload-target`  | yes    | Where to send the photo (as for record files)                                                                          |
| POST   | `/api/places/:id/photo`                | yes    | `{ upload }` → `{ place }`; replaces the old photo (photos only, not PDFs)                                             |
| GET    | `/api/places/:id/photo`                | yes    | `?variant=thumb\|preview\|original`: the photo, after the access check                                                 |
| DELETE | `/api/places/:id/photo`                | yes    | 204                                                                                                                    |
| GET    | `/api/labels/:code`                    | yes    | `{ label }`: the account, your role and the place (`placeId` null: blank). Not shared with you: 404                    |
| POST   | `/api/labels/:code/place`              | yes    | Names a blank label: place fields → 201 `{ place }`                                                                    |
| GET    | `/api/labels/blank`                    | yes    | `?ownerId=` → `{ labels }`: blank labels not named yet                                                                 |
| POST   | `/api/labels/blank`                    | yes    | `{ ownerId, count }` (1–120) → 201 `{ codes }`                                                                         |
| PUT    | `/api/account/password`                | yes    | `{ currentPassword, newPassword }` → 204, other devices signed out                                                     |
| PUT    | `/api/account/security`                | yes    | `{ lockAfterMinutes?, twoStepEnabled?, currentPassword? }` → `{ user }` (turning two-step off needs `currentPassword`) |
| GET    | `/api/account/passkeys`                | yes    | `{ passkeys }`: name, dates, synced                                                                                    |
| POST   | `/api/account/passkeys/options`        | yes    | The prompt to make a new passkey                                                                                       |
| POST   | `/api/account/passkeys`                | yes    | `{ name, response }` → 201 `{ passkey }`                                                                               |
| DELETE | `/api/account/passkeys/:id`            | yes    | 204                                                                                                                    |
| GET    | `/api/account/browsers`                | yes    | `{ browsers }`: remembered browsers, `current` marks this one                                                          |
| DELETE | `/api/account/browsers/:id`            | yes    | 204; that browser gets the code again                                                                                  |
| DELETE | `/api/account/browsers`                | yes    | 204; forget them all                                                                                                   |
| POST   | `/api/account/sign-out-others`         | yes    | 204; every other browser and device is signed out                                                                      |

| Status | When                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | The form didn't pass validation (`errors` says which field), a code or passkey didn't work, or two-step sign-in timed out (`signInExpired: true`) |
| 403    | Signed in, but not allowed (for example "Can view" family changing a record)                                                                      |
| 401    | Not signed in, or wrong sign-in                                                                                                                   |
| 423    | Signed in, but locked: enter the password again (`locked: true`)                                                                                  |
| 404    | Not found                                                                                                                                         |
| 409    | Email already has an account                                                                                                                      |
| 429    | Too many tries (`Retry-After` says how many seconds to wait)                                                                                      |
| 503    | Email (Forgot password, invitations) or uploads (Cloudinary) aren't set up on the server                                                          |

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
   - add a `…Json` function in `json/<feature>.ts`
7. **Wire it up**: add the repository to `composition/repositories.ts`, and create the use cases and routes in that area's `composition/<area>Module.ts` (or a new module, added in `buildApp.ts`).
8. **Website**:
   - `infrastructure/api/<feature>Api.ts`
   - `application/<feature>/use….ts`
   - components in `presentation/components/<feature>/` and a short page in `presentation/pages/<feature>/`
   - a route in `App.tsx`, inside `<RequireAuth />`
9. **Tests**:
   - fixtures in `test/fixtures/`
   - unit tests for the rules
   - an integration test for the routes
   - add the new table to the `truncate` in `test/integration/support/seed.ts`

---

## Reading lab results from a photo or PDF

Free and private: the picture never leaves the phone or computer.

- **PDFs with text** (most hospital and lab PDFs): the text is taken straight from the PDF ([pdf.js](https://mozilla.github.io/pdf.js/)), so it's exact.
- **Photos and scanned PDFs:** [Tesseract.js](https://tesseract.projects.naptha.ai/) reads them in the browser. Before reading, the picture is made bigger, grey, and the table lines are painted out (that's what trips the reader up most). Up to 5 pages.
- **Finding the results:** `packages/shared/src/scan/` (one step per file: `tidyLine` → `findTest` → `takeValue` → `takeRange` → `units` → `doubts`, put together in `readLabLines.ts`) turns each line into test, result, unit and normal range. It knows the usual Philippine CBC, chemistry and urinalysis names (`scan/tests/`, one file per panel) and their other spellings (SGPT / ALT, FBS, Pus cells…). When a printout has no normal range, the range stays empty; Talaan never makes one up. Rows it's unsure of say why: an unknown test name, a range that looks wrong, a hard-to-read line, or a letter O read as 0. The phone app will use the same file.

**The reader's files** (about 7 MB the first time, then cached) are served by Talaan itself from `/reader/`, not from another site. `pnpm dev` and `pnpm build` copy them from `node_modules` into `apps/web/public/reader/` (`apps/web/scripts/copy-reader-files.mjs`), so they're not in git. Running WebAssembly needs `'wasm-unsafe-eval'` in the site's security rules (`script-src` in `apps/api/src/buildApp.ts`); that allows WebAssembly only, not `eval`.

Works best with a clear, straight photo of a printed result in good light. Handwriting isn't read well.

---

## Tests

```bash
docker compose up -d db
turbo run test
```

| Suite           | Where                              | What it checks                                                                                                                                                                                                                                                                                     |
| --------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API unit        | `apps/api/test/unit`               | User rules, place levels, shared schemas, use cases with fake repositories (no database)                                                                                                                                                                                                           |
| API integration | `apps/api/test/integration`        | Register, sign in, two-step codes, remembered browsers, passkeys (with a fake device), family invitations, access and profiles, records, the Trash and the audit trail, uploads (through the local storage) and who can see them, places, QR labels and place photos, sessions, rate limit, errors |
| Shared unit     | `packages/shared/src/**/*.test.ts` | Reading lab lines: formats, units, ranges, urinalysis, doubts, no made-up ranges                                                                                                                                                                                                                   |
| Website unit    | `apps/web/src/**/*.test.ts`        | The API client (`ApiError`), error messages, dates, PDF line grouping, table-line removal, adding read rows to the form, the places tree, fitting labels on paper                                                                                                                                  |

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

| Problem                                                   | Fix                                                                                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `turbo: command not found`                                | `pnpm add -g turbo`                                                                                                                                                                              |
| dbmate: connection refused on `[::1]:5432`                | Start Docker Desktop and `docker compose up -d db`; use `127.0.0.1` in `DATABASE_URL`                                                                                                            |
| `password authentication failed`                          | `DATABASE_URL` doesn't match `.env`, or the database was created with old values: `docker compose down -v`, then `docker compose up -d db`                                                       |
| Port 5432 already in use                                  | Another Postgres is running (another project?): stop it, or change `"5432:5432"` to `"5433:5432"` in `docker-compose.yml` and the port in `DATABASE_URL`                                         |
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | Another database uses port 5432. Stop it (`docker ps`, then `docker stop <name>`), or set `POSTGRES_PORT=5433` in `.env` and use `:5433` in `DATABASE_URL`, then `docker compose up -d db` again |
| `Cannot find module '@talaan/shared'`                     | `turbo run build` (the shared package must be built first)                                                                                                                                       |
| `SESSION_SECRET must be at least 32 characters`           | `openssl rand -hex 32` and paste the result                                                                                                                                                      |
| Uploads say "isn't set up"                                | The live site needs `CLOUDINARY_URL` (README → "Storing photos and PDFs")                                                                                                                        |
| Upload fails with "The file couldn't be stored: …"        | Cloudinary refused it: check `CLOUDINARY_URL` (key, secret, cloud name) and that the API key is enabled                                                                                          |
| "Passkeys don't work on this address"                     | The page's address isn't `APP_URL`. Open the site from that address (locally `http://localhost:5173`, not `127.0.0.1`), or fix `APP_URL`                                                         |
| No sign-in code arrives locally                           | Start Mailpit (`docker compose up -d mail`) and look at http://localhost:8025                                                                                                                    |
| A 500 error right after pulling new code                  | A migration hasn't run: `turbo run db:migrate`                                                                                                                                                   |
| Logged out after every request in Docker or on a server   | Plain `http`: set `COOKIE_SECURE=false`; behind a proxy with HTTPS, keep it `true`                                                                                                               |
| `Set TEST_DATABASE_URL (or DATABASE_URL …)` in tests      | Create `apps/api/.env`, or run tests through `turbo run` (it passes these variables on)                                                                                                          |
| CI fails but it works on Windows                          | File name case: Linux sees `HomePage.tsx` and `homepage.tsx` as different files                                                                                                                  |
