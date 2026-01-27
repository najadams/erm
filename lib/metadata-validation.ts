import { z } from 'zod';

// Define known field schemas for strict governance
// These align with the definition in seed_governance.ts
export const KNOWN_METADATA_FIELDS = {
    // Strings / Enums
    classification: z.enum(['PUBLIC', 'CONFIDENTIAL', 'INTERNAL', 'RESTRICTED']),
    status: z.enum(['DRAFT', 'SUBMITTED', 'ACTIVE', 'ARCHIVED', 'DISPOSED']),
    
    // Investment Specific
    investmentAmount: z.number().min(0),
    currency: z.enum(['GHS', 'USD', 'EUR', 'GBP', 'OTHER']),
    minimumCapital: z.number().min(0),
    expectedJobs: z.number().int().min(0).optional(),
    
    // Company / Legal
    certificateNumber: z.string().min(1),
    companyName: z.string().min(1),
    tin: z.string().regex(/^[A-Z0-9-]{5,20}$/, "Invalid TIN format"),
    
    // Dates (Input as string or Date)
    registrationDate: z.coerce.date(),
    expiryDate: z.coerce.date().optional(),
    effectiveDate: z.coerce.date(),
    
    // Generic
    description: z.string().max(2000).optional(),
    tags: z.array(z.string()).optional(),
};

// Generic Schema for unknown fields (ensure mostly primitives)
const startMetadataSchema = z.record(z.string(), z.union([
    z.string(), 
    z.number(), 
    z.boolean(), 
    z.null(), 
    z.array(z.string())
]));

// Fields that cannot be changed after registration without ADMIN override
export const IMMUTABLE_FIELDS_WHEN_REGISTERED = [
    'classification', // Security level
    'certificateNumber', // Identity
    'companyName', // Identity
    'registrationDate', // Identity
    'sector', // Key Classification
    'minimumCapital', // Qualification Criteria
    'tin' // Identity
];

/**
 * Validates a single metadata value against a known schema if it exists.
 */
export function validateMetadataField(key: string, value: any) {
    const schema = (KNOWN_METADATA_FIELDS as any)[key];
    if (schema) {
        return schema.parse(value);
    }
    // Default strict check for basic types if no specific schema
    if (value === null || value === undefined) return value;
    if (['string', 'number', 'boolean'].includes(typeof value)) return value;
    if (Array.isArray(value)) return value; // Arrays allowed
    // Reject objects?
    return value;
}

/**
 * Validates an entire metadata object.
 * Returns the parsed/validated object.
 */
export function validateMetadata(metadata: Record<string, any>) {
    const safeData: Record<string, any> = {};
    const errors: string[] = [];

    Object.entries(metadata).forEach(([key, val]) => {
        try {
            safeData[key] = validateMetadataField(key, val);
        } catch (e: any) {
            errors.push(`Field '${key}': ${e.message}`);
        }
    });

    if (errors.length > 0) {
        throw new Error(`Metadata Validation Failed: ${errors.join('; ')}`);
    }

    return safeData;
}
