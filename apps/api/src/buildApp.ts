import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import type { Pool } from "pg";
import { CreateNote } from "./application/note/CreateNote.js";
import { DeleteNote } from "./application/note/DeleteNote.js";
import { GetNote } from "./application/note/GetNote.js";
import { ListNotes } from "./application/note/ListNotes.js";
import { UpdateNote } from "./application/note/UpdateNote.js";
import type { Clock } from "./application/ports/Clock.js";
import type { PasswordHasher } from "./application/ports/PasswordHasher.js";
import { GetCurrentUser } from "./application/user/GetCurrentUser.js";
import { LogInUser } from "./application/user/LogInUser.js";
import { RegisterUser } from "./application/user/RegisterUser.js";
import { PostgresNoteRepository } from "./infrastructure/database/PostgresNoteRepository.js";
import { PostgresUserRepository } from "./infrastructure/database/PostgresUserRepository.js";
import { apiNotFound, errorHandler } from "./presentation/http/errorHandler.js";
import { rateLimit } from "./presentation/http/middleware/rateLimit.js";
import { authRoutes } from "./presentation/http/routes/authRoutes.js";
import { healthRoutes } from "./presentation/http/routes/healthRoutes.js";
import { noteRoutes } from "./presentation/http/routes/noteRoutes.js";
import { createSessionMiddleware } from "./presentation/http/session.js";

export interface BuildAppOptions {
  pool: Pool;
  sessionSecret: string;
  passwordHasher: PasswordHasher;
  clock: Clock;
  // HTTPS-only cookies (production)
  secureCookie: boolean;
  // Behind a proxy (Render, a load balancer): trust X-Forwarded-For / -Proto
  trustProxy: boolean;
  // The built website (apps/web/dist). When set, the API serves it too: one server, one address.
  webDistDir?: string;
  // Login/register tries per visitor every 15 minutes
  authLimit?: number;
}

// The composition root: the only place that knows every concrete class.
// main.ts runs it for real; the tests build their own copy.
export function buildApp(options: BuildAppOptions) {
  const users = new PostgresUserRepository(options.pool);
  const notes = new PostgresNoteRepository(options.pool);

  const app = express();
  app.disable("x-powered-by");
  if (options.trustProxy) app.set("trust proxy", 1);

  app.use(express.json({ limit: "100kb" }));
  app.use(
    createSessionMiddleware({
      pool: options.pool,
      secret: options.sessionSecret,
      secureCookie: options.secureCookie,
    }),
  );

  app.use("/api", healthRoutes(options.pool));
  app.use(
    "/api",
    authRoutes({
      registerUser: new RegisterUser(users, options.passwordHasher),
      logInUser: new LogInUser(users, options.passwordHasher),
      getCurrentUser: new GetCurrentUser(users),
      limit: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: options.authLimit ?? 20,
        clock: options.clock,
        message: "Too many tries. Please wait a few minutes.",
      }),
    }),
  );
  app.use(
    "/api",
    noteRoutes({
      listNotes: new ListNotes(notes),
      getNote: new GetNote(notes),
      createNote: new CreateNote(notes),
      updateNote: new UpdateNote(notes),
      deleteNote: new DeleteNote(notes),
    }),
  );
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
  return app;
}
