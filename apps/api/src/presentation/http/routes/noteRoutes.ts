import { noteInputSchema } from "@pern/shared";
import { Router } from "express";
import type { CreateNote } from "../../../application/note/CreateNote.js";
import type { DeleteNote } from "../../../application/note/DeleteNote.js";
import type { GetNote } from "../../../application/note/GetNote.js";
import type { ListNotes } from "../../../application/note/ListNotes.js";
import type { UpdateNote } from "../../../application/note/UpdateNote.js";
import { currentUserId, requireAuth } from "../middleware/requireAuth.js";
import { parseNoteId } from "../parseId.js";
import { noteJson } from "../toJson.js";

// The example CRUD feature. Copy this file's shape for your own features.
export function noteRoutes(deps: {
  listNotes: ListNotes;
  getNote: GetNote;
  createNote: CreateNote;
  updateNote: UpdateNote;
  deleteNote: DeleteNote;
}) {
  const router = Router();
  router.use("/notes", requireAuth);

  router.get("/notes", async (req, res) => {
    const notes = await deps.listNotes.execute(currentUserId(req));
    res.json({ notes: notes.map(noteJson) });
  });

  router.post("/notes", async (req, res) => {
    const content = noteInputSchema.parse(req.body);
    const note = await deps.createNote.execute(currentUserId(req), content);
    res.status(201).json({ note: noteJson(note) });
  });

  router.get("/notes/:id", async (req, res) => {
    const note = await deps.getNote.execute(
      parseNoteId(req.params.id),
      currentUserId(req),
    );
    res.json({ note: noteJson(note) });
  });

  router.put("/notes/:id", async (req, res) => {
    const id = parseNoteId(req.params.id);
    const content = noteInputSchema.parse(req.body);
    const note = await deps.updateNote.execute(id, currentUserId(req), content);
    res.json({ note: noteJson(note) });
  });

  router.delete("/notes/:id", async (req, res) => {
    await deps.deleteNote.execute(
      parseNoteId(req.params.id),
      currentUserId(req),
    );
    res.status(204).end();
  });

  return router;
}
