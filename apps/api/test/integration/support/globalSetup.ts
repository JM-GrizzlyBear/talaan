import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBinary } from "dbmate";
import { testDatabaseUrl } from "./testDatabase.js";

const apiDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

// Runs once before the integration tests: creates the test database if it
// doesn't exist yet and applies every migration, exactly like production
export default function setup() {
  const url = testDatabaseUrl();
  execFileSync(
    resolveBinary(),
    [
      "--url",
      url,
      "--migrations-dir",
      path.join(apiDir, "db/migrations"),
      "--no-dump-schema",
      "up",
    ],
    { stdio: "inherit" },
  );
}
