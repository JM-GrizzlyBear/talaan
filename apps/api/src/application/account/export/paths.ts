import type { RecordFile } from "../../../domain/file/RecordFile.js";
import type { Place } from "../../../domain/place/Place.js";
import type { HealthRecord } from "../../../domain/record/HealthRecord.js";

// Names that work as folder and file names on Windows, Mac and phones
export function safeName(text: string, max = 80) {
  const name = text
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+|[.\s]+$/g, "")
    .slice(0, max)
    .trim();
  return name || "Untitled";
}

export const FILES_FOLDER = "Photos and PDFs";

// Where each photo and PDF goes in the ZIP:
// "Photos and PDFs/Maria Santos/2026-10-05 CBC/1 cbc.jpg"
export class ExportPaths {
  private readonly taken = new Set<string>();
  readonly forFile = new Map<string, string>();
  readonly forPlace = new Map<string, string>();

  private unique(path: string) {
    let candidate = path;
    for (let n = 2; this.taken.has(candidate.toLowerCase()); n++) {
      const dot = path.lastIndexOf(".");
      candidate =
        dot > path.lastIndexOf("/")
          ? `${path.slice(0, dot)} (${n})${path.slice(dot)}`
          : `${path} (${n})`;
    }
    this.taken.add(candidate.toLowerCase());
    return candidate;
  }

  addRecordFiles(
    record: HealthRecord,
    person: string,
    files: RecordFile[],
    inTrash: boolean,
  ) {
    const folder = this.unique(
      `${FILES_FOLDER}/${safeName(person)}${inTrash ? "/In the Trash" : ""}/${record.recordDate} ${safeName(record.title, 60)}`,
    );
    files.forEach((file, i) => {
      const base = safeName(file.originalName.replace(/\.[^.]+$/, ""), 60);
      this.forFile.set(
        file.id,
        this.unique(`${folder}/${i + 1} ${base}.${file.format}`),
      );
    });
  }

  addPlacePhoto(place: Place) {
    if (!place.photo) return;
    this.forPlace.set(
      place.id,
      this.unique(
        `${FILES_FOLDER}/Places/${safeName(place.name, 60)}.${place.photo.format}`,
      ),
    );
  }
}
