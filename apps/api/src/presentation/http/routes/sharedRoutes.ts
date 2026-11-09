import { FILE_VARIANTS, openShareSchema } from "@talaan/shared";
import {
  Router,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import { z } from "zod";
import {
  LINK_ENDED,
  type SharedPages,
} from "../../../application/share/SharedPages.js";
import { NotFoundError } from "../../../domain/errors.js";
import { safeFileName } from "../../../domain/file/rules.js";
import { sharedPageJson } from "../json/shares.js";
import { idParam } from "../params.js";
import { readCookie } from "../trustCookie.js";
import { browserLabel } from "../userAgent.js";

// The key a browser keeps after opening a link; only sent back to that link
const VIEW_COOKIE = "talaan.sv";

const contentQuery = z.object({
  variant: z.enum(FILE_VARIANTS).default("original"),
  download: z.literal("1").optional(),
});

function tokenParam(value: unknown) {
  const token = z
    .string()
    .regex(/^[A-Za-z0-9_-]{20,64}$/)
    .safeParse(value);
  if (!token.success) throw new NotFoundError(LINK_ENDED);
  return token.data;
}

const cookiePath = (token: string) => `/api/shared/${token}`;

function viewer(req: Request) {
  return {
    userId: req.session?.userId,
    viewKey: readCookie(req, VIEW_COOKIE),
  };
}

// Health records: never kept by the browser or a proxy, never in search engines
function private_(res: Response) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
}

// The doctor's page (no sign-in)
export function sharedRoutes(deps: {
  pages: SharedPages;
  secureCookie: boolean;
  // Per visitor: looking and opening files
  publicLimit: RequestHandler;
  // Per visitor: typing the PIN
  pinLimit: RequestHandler;
}) {
  const router = Router();

  router.get("/shared/:token", deps.publicLimit, async (req, res) => {
    private_(res);
    const shown = await deps.pages.look(
      tokenParam(req.params.token),
      viewer(req),
    );
    res.json(
      "page" in shown && shown.page
        ? { page: sharedPageJson(shown.page) }
        : { gate: shown.gate },
    );
  });

  router.post("/shared/:token/open", deps.pinLimit, async (req, res) => {
    private_(res);
    const token = tokenParam(req.params.token);
    const { pin } = openShareSchema.parse(req.body ?? {});
    const opened = await deps.pages.open(
      token,
      viewer(req),
      pin,
      browserLabel(req.headers["user-agent"]),
    );
    if (opened.key) {
      res.cookie(VIEW_COOKIE, opened.key, {
        httpOnly: true,
        sameSite: "lax",
        secure: deps.secureCookie,
        path: cookiePath(token),
        // Until the link ends (counted from the server's clock)
        maxAge: opened.keepFor,
      });
    }
    res.json({ page: sharedPageJson(opened.page) });
  });

  router.get(
    "/shared/:token/files/:fileId/content",
    deps.publicLimit,
    async (req, res) => {
      const query = contentQuery.parse(req.query);
      const opened = await deps.pages.openFile(
        tokenParam(req.params.token),
        viewer(req),
        idParam(req.params.fileId),
        query.variant,
      );
      const name = safeFileName(opened.file.originalName, opened.file.format);
      res.setHeader("Content-Type", opened.contentType);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Robots-Tag", "noindex");
      res.setHeader(
        "Content-Disposition",
        `${query.download ? "attachment" : "inline"}; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      );
      opened.body.on("error", (error) => {
        console.error(`Couldn't send shared file ${opened.file.id}:`, error);
        res.destroy(error);
      });
      opened.body.pipe(res);
    },
  );

  return router;
}
