import path from "node:path";

import type { LeonardoEventContactAssignment } from "@/types/lean-event";

import { createEntityBlobStore, isEntityBlobStorageEnabled } from "./entity-blob-storage";
import { readManagedEntity, readManagedEntityList } from "./entity-read";
import {
  deleteJsonFile,
  getDataRoot,
  listJsonFiles,
  readJsonFile,
  writeJsonFile,
} from "./storage";

const BLOB_ROOT = "lean-event/event-assignments";
const assignmentBlob = createEntityBlobStore(BLOB_ROOT);

export function getAssignmentDir(tenantId: string): string {
  return path.join(getDataRoot(), "event-assignments", tenantId);
}

export function getAssignmentFilePath(
  tenantId: string,
  assignmentId: string
): string {
  return path.join(getAssignmentDir(tenantId), `${assignmentId}.json`);
}

async function listAssignmentsFromBlobOrFs(
  tenantId: string
): Promise<LeonardoEventContactAssignment[]> {
  if (isEntityBlobStorageEnabled()) {
    return assignmentBlob.listAll<LeonardoEventContactAssignment>(tenantId);
  }

  const dir = getAssignmentDir(tenantId);
  const files = await listJsonFiles(dir);
  const assignments = await Promise.all(
    files.map((file) =>
      readJsonFile<LeonardoEventContactAssignment>(`${dir}/${file}`)
    )
  );
  return assignments.filter(
    (assignment): assignment is LeonardoEventContactAssignment =>
      Boolean(assignment)
  );
}

async function getAssignmentFromBlobOrFs(
  tenantId: string,
  assignmentId: string
): Promise<LeonardoEventContactAssignment | null> {
  if (isEntityBlobStorageEnabled()) {
    return assignmentBlob.get<LeonardoEventContactAssignment>(
      tenantId,
      assignmentId
    );
  }
  return readJsonFile<LeonardoEventContactAssignment>(
    getAssignmentFilePath(tenantId, assignmentId)
  );
}

export async function listStoredAssignments(
  tenantId: string
): Promise<LeonardoEventContactAssignment[]> {
  return readManagedEntityList(tenantId, "assignment", () =>
    listAssignmentsFromBlobOrFs(tenantId)
  );
}

export async function getStoredAssignment(
  tenantId: string,
  assignmentId: string
): Promise<LeonardoEventContactAssignment | null> {
  return readManagedEntity(tenantId, "assignment", assignmentId, () =>
    getAssignmentFromBlobOrFs(tenantId, assignmentId)
  );
}

export async function saveStoredAssignment(
  assignment: LeonardoEventContactAssignment
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await assignmentBlob.save(assignment);
    return;
  }
  await writeJsonFile(
    getAssignmentFilePath(assignment.tenantId, assignment.id),
    assignment
  );
}

export async function deleteStoredAssignment(
  tenantId: string,
  assignmentId: string
): Promise<void> {
  if (isEntityBlobStorageEnabled()) {
    await assignmentBlob.delete(tenantId, assignmentId);
    return;
  }
  await deleteJsonFile(getAssignmentFilePath(tenantId, assignmentId));
}
