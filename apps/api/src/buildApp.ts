import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import { accountsModule } from "./composition/accountsModule.js";
import { createContext } from "./composition/context.js";
import { familyModule } from "./composition/familyModule.js";
import type { BuildAppOptions } from "./composition/options.js";
import { recordsModule } from "./composition/recordsModule.js";
import { apiNotFound, errorHandler } from "./presentation/http/errorHandler.js";
import { healthRoutes } from "./presentation/http/routes/healthRoutes.js";
import { createSessionMiddleware } from "./presentation/http/session.js";

export type { BuildAppOptions };

// The composition root: the only place that knows every concrete class (the
// wiring for each area lives in composition/). main.ts runs it for real; the
// tests build their own copy.
export function buildApp(options: BuildAppOptions) {
  const context = createContext(options);
  const accounts = accountsModule(context);
  const family = familyModule(context);
  const records = recordsModule(context, family.members);

  const app = express();
  app.disable("x-powered-by");
  if (options.trustProxy > 0) app.set("trust proxy", options.trustProxy);

  // Security headers: no framing, no MIME sniffing, a strict content security policy, …
  // The website may also upload straight to Cloudinary, and show photos it's about to upload.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "connect-src": ["'self'", "https://api.cloudinary.com"],
          "img-src": ["'self'", "data:", "blob:"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(
    createSessionMiddleware({
      pool: options.pool,
      secret: options.sessionSecret,
      secureCookie: options.secureCookie,
    }),
  );

  app.use("/api", healthRoutes(options.pool));
  for (const router of [...accounts, ...family.routers, ...records.routers]) {
    app.use("/api", router);
  }
  app.use("/api", apiNotFound);

  // Production: serve the website, and send every other page to index.html (React Router)
  if (options.webDistDir && existsSync(options.webDistDir)) {
    const indexHtml = path.join(options.webDistDir, "index.html");
    app.use(express.static(options.webDistDir, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      res.sendFile(indexHtml);
    });
  }

  app.use(errorHandler);
  // main.ts runs this every hour: records 30 days in the Trash are deleted for good
  return Object.assign(app, {
    purgeExpiredTrash: () => records.trash.purgeExpired(),
  });
}
