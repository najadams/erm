/**
 * MEILISEARCH CLIENT
 *
 * Singleton client for Meilisearch with graceful degradation.
 * If MEILI_URL is not set or Meilisearch is unreachable, all operations
 * resolve silently so the app falls back to PostgreSQL FTS.
 */

import { MeiliSearch, Index } from 'meilisearch';

// =============================================================================
// TYPES
// =============================================================================

export interface SearchableRecord {
  id: string;
  title: string;
  referenceNumber: string | null;
  description: string | null;
  tags: string | null;
  companySnapshotName: string | null;
  classificationName: string | null;
  departmentName: string | null;
  ownerName: string | null;
  status: string;
  securityClassification: string;
  departmentId: string | null;
  classificationNodeId: string | null;
  registeredCompanyId: string | null;
  sector: string | null;
  ownerId: string;
  createdAt: number; // Unix timestamp for Meilisearch
}

export interface SearchResult {
  hits: Array<{
    id: string;
    title: string;
    referenceNumber: string | null;
    _formatted?: Record<string, string>;
  }>;
  totalHits: number;
  facetDistribution?: Record<string, Record<string, number>>;
  processingTimeMs: number;
}

// =============================================================================
// CLIENT SINGLETON
// =============================================================================

const MEILI_URL = process.env.MEILI_URL;
const MEILI_KEY = process.env.MEILI_MASTER_KEY;
const INDEX_NAME = 'records';

let client: MeiliSearch | null = null;
let available = false;

function getClient(): MeiliSearch | null {
  if (!MEILI_URL) return null;
  if (!client) {
    client = new MeiliSearch({
      host: MEILI_URL,
      apiKey: MEILI_KEY,
    });
    // Test connectivity on first use
    client.health()
      .then(() => {
        available = true;
        console.log('[Meilisearch] Connected to', MEILI_URL);
      })
      .catch((err) => {
        available = false;
        console.warn('[Meilisearch] Connection failed (degrading gracefully):', err.message);
      });
  }
  return client;
}

function getIndex(): Index | null {
  const c = getClient();
  if (!c) return null;
  return c.index(INDEX_NAME);
}

export function isMeiliAvailable(): boolean {
  return available && !!MEILI_URL;
}

// =============================================================================
// INDEX CONFIGURATION
// =============================================================================

export async function configureIndex(): Promise<void> {
  const c = getClient();
  if (!c) return;

  try {
    // Create index if not exists
    await c.createIndex(INDEX_NAME, { primaryKey: 'id' });

    const index = c.index(INDEX_NAME);

    // Searchable attributes (order = weight)
    await index.updateSearchableAttributes([
      'title',
      'referenceNumber',
      'description',
      'tags',
      'companySnapshotName',
      'classificationName',
      'departmentName',
      'ownerName',
    ]);

    // Filterable attributes (for faceted search + ACS intersection)
    await index.updateFilterableAttributes([
      'status',
      'securityClassification',
      'departmentId',
      'classificationNodeId',
      'registeredCompanyId',
      'sector',
      'ownerId',
      'createdAt',
      'id',
    ]);

    // Sortable attributes
    await index.updateSortableAttributes([
      'createdAt',
      'title',
    ]);

    // Ranking rules
    await index.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
    ]);

    available = true;
    console.log('[Meilisearch] Index configured successfully');
  } catch (err: any) {
    console.warn('[Meilisearch] Index configuration failed:', err.message);
    available = false;
  }
}

// =============================================================================
// SEARCH
// =============================================================================

export async function searchRecords(
  query: string,
  filters?: {
    status?: string;
    departmentId?: string;
    classificationNodeId?: string;
    registeredCompanyId?: string;
    sector?: string;
    accessibleIds?: string[];
  },
  options?: {
    limit?: number;
    offset?: number;
    sort?: string[];
  }
): Promise<SearchResult | null> {
  const index = getIndex();
  if (!index || !available) return null;

  try {
    // Build filter string
    const filterParts: string[] = [];

    if (filters?.status) {
      filterParts.push(`status = "${filters.status}"`);
    }
    if (filters?.departmentId) {
      filterParts.push(`departmentId = "${filters.departmentId}"`);
    }
    if (filters?.classificationNodeId) {
      filterParts.push(`classificationNodeId = "${filters.classificationNodeId}"`);
    }
    if (filters?.registeredCompanyId) {
      filterParts.push(`registeredCompanyId = "${filters.registeredCompanyId}"`);
    }
    if (filters?.sector) {
      filterParts.push(`sector = "${filters.sector}"`);
    }

    // ACS: restrict to accessible record IDs
    if (filters?.accessibleIds && filters.accessibleIds.length > 0) {
      const idList = filters.accessibleIds.map(id => `"${id}"`).join(', ');
      filterParts.push(`id IN [${idList}]`);
    }

    const result = await index.search(query, {
      filter: filterParts.length > 0 ? filterParts.join(' AND ') : undefined,
      limit: options?.limit || 20,
      offset: options?.offset || 0,
      sort: options?.sort,
      attributesToHighlight: ['title', 'description', 'tags'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      facets: ['status', 'securityClassification', 'departmentId', 'sector'],
    });

    return {
      hits: result.hits as SearchResult['hits'],
      totalHits: result.estimatedTotalHits || 0,
      facetDistribution: result.facetDistribution,
      processingTimeMs: result.processingTimeMs,
    };
  } catch (err: any) {
    console.warn('[Meilisearch] Search failed, falling back:', err.message);
    available = false;
    return null;
  }
}
