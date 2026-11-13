# Putting Talaan online (free): Netlify + Render + Neon

Talaan runs in three free places. Set them up once (about 30 minutes), then every merge to `main` updates them by itself.

```
website ── Netlify  https://<your-site>.netlify.app ──┐
                     /api/* is passed on               │
phone app (Expo Go) ──https──▶ the same Netlify address ┤
                                                       ▼
                         Render  https://talaan-api.onrender.com  (API only)
                                                       │
                                                       ▼
                                             Neon (Postgres database)
```

- **Netlify** serves the website. It passes every `/api/...` request on to Render, so the website, the phone app and the emails all use **one address** (the Netlify one), and sign-in cookies stay first-party.
- **Render** runs only the API (`apps/api/Dockerfile`). It doesn't serve the website.
- **Neon** keeps the data.
- **cron-job.org** (free) knocks on the API every 10 minutes so it doesn't fall asleep.

Already set up the old way (one Render service with the website)? Do steps 2, 3 and 4, then point the app at the Netlify address (step 5). Your data in Neon stays.

---

## 1. The database on Neon

1. Go to [neon.tech](https://neon.tech) and sign up (GitHub sign-in is fine).
2. **New project** → name `talaan`, Postgres 17, region **AWS Asia Pacific (Singapore)** (closest to the Philippines).
3. On the project page, **Connect** → copy the connection string. It looks like:
   `postgres://neondb_owner:••••@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
4. Keep it somewhere private for step 2. Don't put it in git or paste it in chats.

Neon's free plan sleeps the database after 5 minutes without use and wakes it in about a second, so that's not a problem. The API only touches the database when someone uses Talaan, when a reminder is due, and once an hour for clean-up, so the free monthly hours are plenty.

## 2. The API on Render

1. Go to [render.com](https://render.com) and sign up with GitHub.
2. **New** → **Web Service** → pick the `talaan` repo.
3. Settings:

   | Setting                       | Value                                                                          |
   | ----------------------------- | ------------------------------------------------------------------------------ |
   | Name                          | `talaan-api` (gives `https://talaan-api.onrender.com`)                         |
   | Branch                        | `main`                                                                         |
   | Language                      | **Docker**                                                                     |
   | Dockerfile Path (in Advanced) | `apps/api/Dockerfile`                                                          |
   | Docker Build Context          | `.` (the repo root)                                                            |
   | Health Check Path             | `/api/ping` (not `/api/health`: that one wakes the database every few seconds) |
   | Region                        | **Singapore**                                                                  |
   | Plan                          | **Free**                                                                       |

   Already have a Render service from before? Open it → **Settings** → change **Dockerfile Path** to `apps/api/Dockerfile` (and rename it if you like). Nothing else changes.

4. **Environment variables** (only these):

   | Name                | Value                                                                                                    |
   | ------------------- | -------------------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`      | the Neon connection string from step 1                                                                   |
   | `SESSION_SECRET`    | a new random one: `openssl rand -hex 32` (not your local one)                                            |
   | `APP_URL`           | your **Netlify** address from step 3, like `https://talaan-family.netlify.app` (fill it in after step 3) |
   | `TRUST_PROXY`       | `2` (Netlify, then Render, stand in front of the API)                                                    |
   | `CLOUDINARY_URL`    | your Cloudinary URL                                                                                      |
   | `CLOUDINARY_FOLDER` | `talaan`                                                                                                 |

   **Email (recommended):** without it, sign-in codes and Forgot password are off, and two-step sign-in is skipped. Add the Brevo settings from README → "Sending emails (Brevo)": `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=2525` (Render blocks 587), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.

   **Browser notifications (optional):** `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

5. **Create Web Service**. The first build takes about 5–10 minutes. It also runs the database migrations.
6. Open `https://talaan-api.onrender.com/api/health`. It should say `{"ok":true}`.
   Opening `https://talaan-api.onrender.com` itself shows a "not found" message: that's right, the website lives on Netlify now.

## 3. The website on Netlify

1. Go to [netlify.com](https://www.netlify.com) and sign up with GitHub.
2. **Add new project** → **Import an existing project** → GitHub → pick the `talaan` repo.
3. Netlify reads `netlify.toml` from the repo, so leave the build settings as they are (Branch `main`; the build command and the `apps/web/dist` folder come from the file).
4. **Environment variables** → add one:

   | Name         | Value                                                                      |
   | ------------ | -------------------------------------------------------------------------- |
   | `API_ORIGIN` | `https://talaan-api.onrender.com` (your Render address, no `/` at the end) |

5. **Deploy**. It takes 2–3 minutes.
6. **Project configuration** → **Change project name** → for example `talaan-family`, which gives `https://talaan-family.netlify.app`.
7. Back on Render, set `APP_URL` to that Netlify address (step 2.4) → **Save, rebuild and deploy**. Links in emails (Forgot password, invites, shared links) use it.
8. Open the Netlify address → **Create an account** → add a record or two.
   `https://<your-site>.netlify.app/api/health` should also say `{"ok":true}`: that's Netlify passing the request on to Render.

## 4. Keep the API awake (cron-job.org)

Render's free plan puts the API to sleep after 15 minutes without visits; the next visit then waits about a minute. A free knock every 10 minutes keeps it awake:

1. Go to [cron-job.org](https://cron-job.org) and sign up (free).
2. **Create cronjob**:
   - Title: `Talaan wake`
   - URL: `https://talaan-api.onrender.com/api/ping`
   - Schedule: **Every 10 minutes**
3. **Create**.

`/api/ping` doesn't touch the database, so the knocks don't use Neon's free hours. Render's free plan has 750 hours a month, enough to stay awake all month for one service.

Without this, Talaan still works: the app knocks on the API as soon as it opens, says "Talaan is starting up…" while it wakes, and tries again by itself. Reminder emails may then come a little late.

## 5. The phone app

On your computer, in the repo:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

`apps/mobile/.env` (not in git):

```bash
EXPO_PUBLIC_API_URL=https://talaan-family.netlify.app
```

Use **your Netlify address**, not the Render one: the app also opens the website's lab reader from it.

### Open it with Expo Go

1. Install **Expo Go** on the phone: App Store (iPhone) or Play Store (Android). It must support **Expo SDK 58**; the store version does.
2. On the computer:

   ```bash
   pnpm install
   pnpm --filter @talaan/mobile start
   ```

   `start` builds the shared packages first, then shows a QR code.

3. **iPhone:** scan the QR code with the Camera app, then tap the banner. **Android:** Expo Go → **Scan QR code**.
4. The phone and computer need to be on the **same Wi-Fi**. If it can't connect (office or school Wi-Fi often blocks this):

   ```bash
   pnpm --filter @talaan/mobile start -- --tunnel
   ```

The computer only sends the app's code to the phone. Your records come from the server.

## 6. What to try in the app

Everything on the website is in the app now. A tour:

- **Create an account** right in the app, or **sign in**. The emailed code is asked **once per phone**: sign out and in again, and it isn't asked (for 30 days). The phone shows in Security → "Phones and browsers that skip the code" as "Talaan app on <phone name>".
- **Forgot password?** on the sign-in screen and on the lock screen. When you're signed in, the website's Forgot password link takes you to Security → Change password instead (with "Forgot your current password?" there).
- **Records**: add one by hand or **from a photo** (Take a photo → Talaan reads it → check → save), photos and PDFs, edit, compare lab results, Trash and restore, Activity.
- **Lab results**: table, charts, needs attention, compare, print or save as PDF.
- **Medical ID**: fill it in, emergency QR, lock-screen picture, wallet card printing.
- **Share with a doctor**: a link with a QR code and PIN, see who opened it.
- **Reminders**: medicines, refills, check-ups; Done / Skip / Snooze; alerts come as **phone notifications** (allow them when asked).
- **Places**: where the paper copies are, QR labels to print, **Scan a QR label** with the camera.
- **Family**: invite, accept, profiles without email.
- **Search** (the magnifier at the top).
- **Security**: lock time, two-step sign-in, phones and browsers, sessions, change password. **Your data**: download or delete. **Colors and text size**: the same as on the website.
- **Locking and offline**: leave the app longer than your lock time → it locks (Face ID / fingerprint, or password). Turn on airplane mode → what you opened before still shows, with a "No internet" note.

Expo Go limits: Face ID asks for "Expo Go" rather than "Talaan", and adding a **passkey** works on the website only for now (the app unlocks with the phone's own Face ID / fingerprint). Both come with the store build.

## Something wrong?

| What you see                                                         | Try                                                                                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| "Talaan is starting up…" for long                                    | Open `https://talaan-api.onrender.com/api/ping`. If it's slow, the API was asleep: check the cron-job.org job (step 4).                      |
| "Couldn't reach Talaan…"                                             | Open `<Netlify address>/api/health` in the phone's browser. Check `EXPO_PUBLIC_API_URL`, then restart `start` (it's read when Expo starts).  |
| The website loads, but signing in says it can't reach Talaan         | Netlify → `API_ORIGIN` must be the Render address with `https://` → **Deploys** → **Trigger deploy** (it's read while building).             |
| Netlify build says `API_ORIGIN must be the API's https address`      | Add `API_ORIGIN` (step 3.4), then deploy again.                                                                                              |
| Signing in doesn't stick (asked again each time)                     | Render: `TRUST_PROXY` is `2` and `APP_URL` is the **Netlify** address.                                                                       |
| Links in emails open the Render address                              | Render: set `APP_URL` to the Netlify address.                                                                                                |
| Expo Go says the project is for another SDK                          | Update Expo Go from the store.                                                                                                               |
| A red screen: `undefined is not a function` (or another shared rule) | `start` builds the shared packages first; if it still shows, run `pnpm --filter @talaan/mobile start -- --clear` once.                       |
| "An update for expo is available" in the terminal                    | Safe to ignore. Talaan only uses versions that have been out for 2 weeks; they're updated on purpose, in their own PR.                       |
| The QR code doesn't open anything                                    | Same Wi-Fi, or use `-- --tunnel`.                                                                                                            |
| Render build fails                                                   | Render → the service → **Logs**. Check **Dockerfile Path** is `apps/api/Dockerfile`. A database error usually means `DATABASE_URL` is wrong. |
| No sign-in code email                                                | Render → **Logs**. Use `SMTP_PORT=2525`; check the Brevo sender is verified. Without email, the code step is skipped.                        |

Clearing the database: GitHub → Actions → **Clear database** (README → "Clearing a database"), with the Neon URL as the secret.
