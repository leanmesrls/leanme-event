/**
 * Document store contract — Postgres-backed at runtime.
 * `path` may be a document id or a legacy Blob pathname during cutover.
 * Upload/delete via this contract are intentionally restricted; prefer
 * `lib/lean-event/document-postgres-store` lifecycle APIs.
 */
export interface LeanEventStoredObject {
  path: string;
  bytes: number;
  contentType: string;
  checksumSha256?: string;
  url?: string;
}

export interface LeanEventDocumentStore {
  upload(input: {
    path: string;
    body: Buffer | ArrayBuffer | Blob;
    contentType: string;
    access: "private" | "public";
  }): Promise<LeanEventStoredObject>;
  download(path: string): Promise<Buffer>;
  list(prefix: string): Promise<LeanEventStoredObject[]>;
  delete(path: string): Promise<void>;
  metadata(path: string): Promise<LeanEventStoredObject | null>;
}
