import type { FileFormat } from "@talaan/shared";
import type { Pool } from "pg";
import type { RecordFile, StoredFile } from "../../domain/file/RecordFile.js";
import type { RecordFileRepository } from "../../domain/file/RecordFileRepository.js";

interface FileRow {
  id: string;
  record_id: string;
  owner_id: string;
  storage_key: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  pages: number | null;
  original_name: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: Date;
}

const SELECT = `
  select f.id, f.record_id, f.owner_id, f.storage_key, f.format, f.bytes, f.width,
         f.height, f.pages, f.original_name, f.uploaded_by, f.created_at,
         concat_ws(' ', u.first_name, nullif(u.middle_name, ''), u.last_name) as uploaded_by_name
    from record_files f
    left join users u on u.id = f.uploaded_by`;

function toFile(row: FileRow): RecordFile {
  return {
    id: row.id,
    recordId: row.record_id,
    ownerId: row.owner_id,
    storageKey: row.storage_key,
    format: row.format as FileFormat,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    pages: row.pages,
    originalName: row.original_name,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by ? row.uploaded_by_name : null,
    createdAt: row.created_at,
  };
}

export class PostgresRecordFileRepository implements RecordFileRepository {
  constructor(private readonly pool: Pool) {}

  async listForRecord(recordId: string) {
    const result = await this.pool.query<FileRow>(
      `${SELECT} where f.record_id = $1 order by f.created_at, f.id`,
      [recordId],
    );
    return result.rows.map(toFile);
  }

  async countForRecord(recordId: string) {
    const result = await this.pool.query<{ n: number }>(
      "select count(*)::int as n from record_files where record_id = $1",
      [recordId],
    );
    return result.rows[0].n;
  }

  async findById(id: string) {
    const result = await this.pool.query<FileRow>(`${SELECT} where f.id = $1`, [
      id,
    ]);
    return result.rows[0] ? toFile(result.rows[0]) : null;
  }

  async create(file: {
    recordId: string;
    ownerId: string;
    stored: StoredFile;
    originalName: string;
    uploadedBy: string;
  }) {
    const result = await this.pool.query<{ id: string }>(
      `insert into record_files
         (record_id, owner_id, storage_key, format, bytes, width, height, pages, original_name, uploaded_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning id`,
      [
        file.recordId,
        file.ownerId,
        file.stored.key,
        file.stored.format,
        file.stored.bytes,
        file.stored.width,
        file.stored.height,
        file.stored.pages,
        file.originalName,
        file.uploadedBy,
      ],
    );
    const created = await this.findById(result.rows[0].id);
    if (!created)
      throw new Error("A file disappeared right after it was saved");
    return created;
  }

  async remove(id: string) {
    await this.pool.query("delete from record_files where id = $1", [id]);
  }

  async keysForRecord(recordId: string) {
    const result = await this.pool.query<{ storage_key: string }>(
      "select storage_key from record_files where record_id = $1",
      [recordId],
    );
    return result.rows.map((r) => r.storage_key);
  }
}
