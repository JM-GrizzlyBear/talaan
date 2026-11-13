// Netlify: writes dist/_redirects after the build.
// - /api/* goes to the API on Render (API_ORIGIN), on the same address as the
//   website, so the sign-in cookie works and no CORS is needed
// - every other page is the React app (React Router picks the page)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const origin = (process.env.API_ORIGIN ?? "").trim().replace(/\/+$/, "");
if (!/^https:\/\/[^/\s]+$/.test(origin)) {
  console.error(
    "Set API_ORIGIN in Netlify (like https://talaan-api.onrender.com): where the API runs.",
  );
  process.exit(1);
}

const file = fileURLToPath(new URL("../dist/_redirects", import.meta.url));
writeFileSync(
  file,
  [`/api/*  ${origin}/api/:splat  200!`, "/*  /index.html  200", ""].join("\n"),
);
console.log(`_redirects: /api → ${origin}`);
