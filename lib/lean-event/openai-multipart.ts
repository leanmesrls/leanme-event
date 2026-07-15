import { randomBytes } from "node:crypto";

export interface MultipartFileField {
  fieldName: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export function buildMultipartBody(
  fields: Record<string, string>,
  file: MultipartFileField
): { body: Buffer; contentType: string } {
  const boundary = `LeanMe${randomBytes(12).toString("hex")}`;
  const parts: Buffer[] = [];

  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
        "utf8"
      )
    );
  }

  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"\r\nContent-Type: ${file.mimeType}\r\n\r\n`,
      "utf8"
    )
  );
  parts.push(file.buffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
