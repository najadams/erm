/**
 * SEARCH SYNC SERVICE
 *
 * Handles synchronization between PostgreSQL records and the Meilisearch index.
 * Provides: indexing on create/update, removal on delete, and full reindex.
 */

import { prisma } from '@/lib/prisma';
import { MeiliSearch } from 'meilisearch';
import { configureIndex, isMeiliAvailable } from '@/lib/search';
import type { SearchableRecord } from '@/lib/search';

// =============================================================================
// HELPERS
// =============================================================================

function getClient(): MeiliSearch | null {
  const url = process.env.MEILI_URL;
  if (!url) return null;
  return new MeiliSearch({
    host: url,
    apiKey: process.env.MEILI_MASTER_KEY,
  });
}

/**
 * Transform a Prisma record (with relations) into a SearchableRecord
 */
function toSearchable(record: any): SearchableRecord {
  return {
    id: record.id,
    title: record.title || '',
    referenceNumber: record.referenceNumber || null,
    description: record.description || null,
    tags: record.tags || null,
    companySnapshotName: record.companySnapshotName || null,
    classificationName: record.classificationNode?.name || null,
    departmentName: record.department?.name || null,
    ownerName: record.owner?.name || null,
    status: record.status,
    securityClassification: record.securityClassification || 'OFFICIAL',
    departmentId: record.departmentId || null,
    classificationNodeId: record.classificationNodeId || null,
    registeredCompanyId: record.registeredCompanyId || null,
    sector: record.registeredCompany?.sector || null,
    ownerId: record.ownerId,
    createdAt: Math.floor(new Date(record.createdAt).getTime() / 1000),
  };
}

const RECORD_SELECT = {
  id: true,
  title: true,
  referenceNumber: true,
  description: true,
  tags: true,
  companySnapshotName: true,
  status: true,
  securityClassification: true,
  departmentId: true,
  classificationNodeId: true,
  registeredCompanyId: true,
  ownerId: true,
  createdAt: true,
  classificationNode: { select: { name: true } },
  department: { select: { name: true } },
  owner: { select: { name: true } },
  registeredCompany: { select: { sector: true } },
};

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

/**
 * Index a single record after creation or update
 */
export async function syncOnCreate(recordId: string): Promise<void> {
  if (!isMeiliAvailable()) return;

  try {
    const record = await prisma.record.findUnique({
      where: { id: recordId },
      select: RECORD_SELECT,
    });

    if (!record) return;

    const client = getClient();
    if (!client) return;

    const doc = toSearchable(record);
    await client.index('records').addDocuments([doc]);
  } catch (err: any) {
    console.warn('[Search Sync] Index failed for record', recordId, err.message);
  }
}

/**
 * Update a record in the index (same as create — Meilisearch upserts by ID)
 */
export async function syncOnUpdate(recordId: string): Promise<void> {
  return syncOnCreate(recordId);
}

/**
 * Remove a record from the index
 */
export async function syncOnDelete(recordId: string): Promise<void> {
  if (!isMeiliAvailable()) return;

  try {
    const client = getClient();
    if (!client) return;

    await client.index('records').deleteDocument(recordId);
  } catch (err: any) {
    console.warn('[Search Sync] Delete failed for record', recordId, err.message);
  }
}

/**
 * Full reindex — reads all records from DB and pushes to Meilisearch
 * Uses cursor-based pagination to handle large datasets
 */
export async function fullReindex(): Promise<{ indexed: number; timeMs: number }> {
  const client = getClient();
  if (!client) throw new Error('Meilisearch client not available');

  const start = Date.now();

  // Configure index settings first
  await configureIndex();

  const BATCH_SIZE = 500;
  let cursor: string | undefined = undefined;
  let totalIndexed = 0;

  while (true) {
    const records: any[] = await prisma.record.findMany({
      select: RECORD_SELECT,
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });

    if (records.length === 0) break;

    const docs = records.map(toSearchable);
    await client.index('records').addDocuments(docs);

    totalIndexed += docs.length;
    cursor = records[records.length - 1].id;

    if (records.length < BATCH_SIZE) break;
  }

  return {
    indexed: totalIndexed,
    timeMs: Date.now() - start,
  };
}
