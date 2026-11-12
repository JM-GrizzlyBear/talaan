# Trying the phone app with a free test server

The phone app needs an API it can reach over the internet. This guide sets up a **free test server** (Render + Neon) and opens the app on your phone with **Expo Go** (iPhone and Android). It takes about 20 minutes, once.

This is for testing only. Going live comes in a later step, with its own guide.

```
phone (Expo Go) ──https──▶ Render (API + website) ──▶ Neon (Postgres)
```

---

## 1. A free database on Neon

1. Go to [neon.tech](https://neon.tech) and sign up (GitHub sign-in is fine).
2. **New project** → name `talaan-test`, Postgres 17, region **AWS Asia Pacific (Singapore)** (closest to the Philippines).
3. On the project page, **Connect** → copy the connection string. It looks like:
   `postgres://neondb_owner:••••@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
4. Keep it somewhere private for step 2. Don't put it in git or paste it in chats.

## 2. The API on Render

1. Go to [render.com](https://render.com) and sign up with GitHub.
2. **New** → **Web Service** → pick the `talaan` repo.
3. Settings:

   | Setting  | Value                                                                        |
   | -------- | ---------------------------------------------------------------------------- |
   | Name     | `talaan-test` (gives `https://talaan-test.onrender.com`)                     |
   | Branch   | `main`                                                                       |
   | Language | **Docker** (it uses the repo's `Dockerfile`, which also runs the migrations) |
   | Region   | **Singapore**                                                                |
   | Plan     | **Free**                                                                     |

4. **Environment variables** (Add from .env is fine, but only these):

   | Name                | Value                                                         |
   | ------------------- | ------------------------------------------------------------- |
   | `DATABASE_URL`      | the Neon connection string from step 1                        |
   | `SESSION_SECRET`    | a new random one: `openssl rand -hex 32` (not your local one) |
   | `APP_URL`           | `https://talaan-test.onrender.com` (your service's address)   |
   | `TRUST_PROXY`       | `1`                                                           |
   | `CLOUDINARY_URL`    | your Cloudinary URL                                           |
   | `CLOUDINARY_FOLDER` | `talaan-test` (keeps test files apart)                        |

   **Email (optional but recommended):** without it, sign-in codes and Forgot password are off, and two-step sign-in is skipped. To test them, add the Brevo settings from README → "Sending emails (Brevo)": `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=2525`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.

   **Browser notifications (optional):** `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

5. **Create Web Service**. The first build takes about 5–10 minutes.
6. Open `https://talaan-test.onrender.com/api/health`. It should say `{"ok":true}`.
7. Open `https://talaan-test.onrender.com` and **register** a test account. Add a record or two, so the app has something to show.

**The free plan sleeps** after 15 minutes without visits. The first request after that takes up to a minute; the app says "the test server may be waking up". Just try again.

**Reminders** run every hour while the server is awake. On the sleeping free plan they may come late; that's expected for testing.

## 3. Point the app at the test server

On your computer, in the repo:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

`apps/mobile/.env` (not in git):

```bash
EXPO_PUBLIC_API_URL=https://talaan-test.onrender.com
```

Use your own address if you named the service differently.

## 4. Open it on your phone with Expo Go

1. Install **Expo Go** on the phone: App Store (iPhone) or Play Store (Android). It must support **Expo SDK 58**; the store version does.
2. On the computer:

   ```bash
   pnpm install
   pnpm --filter @talaan/mobile start
   ```

3. A QR code shows in the terminal.
   - **iPhone:** scan it with the Camera app, then tap the banner.
   - **Android:** open Expo Go → **Scan QR code**.
4. The phone and computer need to be on the **same Wi-Fi**. If it can't connect (office or school Wi-Fi often blocks this), stop it and use the tunnel instead:

   ```bash
   pnpm --filter @talaan/mobile start -- --tunnel
   ```

The computer only sends the app's code to the phone. Your records come from the test server, not the computer.

## 5. What to try

- **Sign in** with the test account (a code by email if Brevo is set up).
- **Records**: pick a person, search ("dugo", "cbc"), filter by type, open one, tap a photo to see it full size.
- **Medical ID**: allergies, call buttons, the emergency QR (turn it on on the website first).
- **Settings**: Light / Dark / Same as this phone, text size, colors. Change them on the phone, then reload the website: they match.
- **Locking**: leave the app for longer than your lock time (Security on the website), come back: it's locked. Unlock with **Face ID / fingerprint**, or the password.
- **Offline**: open a few records, turn on airplane mode, close and reopen the app. Unlock with Face ID / fingerprint: what you opened before shows, with a "No internet" note.
- **Sign out**: everything saved on the phone is wiped.

In Expo Go, Face ID asks for permission as "Expo Go" rather than "Talaan"; the real app shows its own name.

## Something wrong?

| What you see                                     | Try                                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Couldn't reach Talaan…"                         | Open `/api/health` in the phone's browser. Wait a minute if the server was asleep. Check `EXPO_PUBLIC_API_URL`, then restart `start` (it's read when Expo starts). |
| Expo Go says the project is for another SDK      | Update Expo Go from the store.                                                                                                                                     |
| The QR code doesn't open anything                | Same Wi-Fi, or use `-- --tunnel`.                                                                                                                                  |
| Render build fails                               | Render → the service → **Logs**. A database error usually means `DATABASE_URL` is wrong.                                                                           |
| Signing in doesn't stick (asked again each time) | Check that `TRUST_PROXY` is `1` and `APP_URL` is the Render address.                                                                                               |

Clearing the test database: GitHub → Actions → **Clear database** (README → "Clearing a database"), with the Neon URL as the secret.
