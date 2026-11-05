import type { RequestHandler } from "express";
import { AuditTrail } from "../application/audit/AuditTrail.js";
import { requireAuth } from "../presentation/http/middleware/requireAuth.js";
import type { BuildAppOptions } from "./options.js";
import { createRateLimits, type RateLimits } from "./rateLimits.js";
import { createRepositories, type Repositories } from "./repositories.js";

// What every area of the app is built from
export interface AppContext {
  options: BuildAppOptions;
  repos: Repositories;
  limits: RateLimits;
  audit: AuditTrail;
  requireAuth: RequestHandler;
}

export function createContext(options: BuildAppOptions): AppContext {
  const repos = createRepositories(options.pool);
  return {
    options,
    repos,
    limits: createRateLimits(options),
    audit: new AuditTrail(repos.audit, repos.users, options.clock),
    requireAuth: requireAuth(options.clock),
  };
}
