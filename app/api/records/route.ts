import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AccessType } from '@prisma/client';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';
import { hasPermission, ROLES, EVERYONE_GROUP_ID } from '@/lib/permissions';
import { assertTransitionAllowed, LifecycleError } from '@/lib/lifecycle';

export const dynamic = 'force-dynamic';

import { getAccessibleRecordsClause } from '@/lib/access';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME, getPublicUrl } from "@/lib/s3";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  const status = searchParams.get('status');
  const groupId = searchParams.get('groupId');
  const departmentId = searchParams.get('departmentId') || searchParams.get('department');
  const projectId = searchParams.get('projectId');
  const uploaderId = searchParams.get('uploader');
  const tag = searchParams.get('tag'); 
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const recordTypeId = searchParams.get('recordTypeId');
  const classificationNodeId = searchParams.get('classificationNodeId');
  const registeredCompanyId = searchParams.get('registeredCompanyId');
  const sector = searchParams.get('sector');

  // 1. Build Search/Filter Clause
  const filters: any[] = [];

  if (q) {
      // High-Performance FTS
      // 1. Get IDs from Postgres FTS
      // Note: We cast q to ensure it's treated as text.
      // plainto_tsquery handles parsing user input safely.
      const ftsResults: any[] = await prisma.$queryRaw`
        SELECT id FROM "Record"
        WHERE search_vector @@ plainto_tsquery('english', ${q})
      `;

      const ftsIds = ftsResults.map(r => r.id);

      if (ftsIds.length > 0) {
          filters.push({ id: { in: ftsIds } });
      } else {
          // FTS found nothing - use ILIKE fallback on title only (indexed)
          // This ensures we don't return empty results when the search term
          // exists in the title but not in the FTS vector
          filters.push({
              title: { contains: q, mode: 'insensitive' }
          });
      }
  }

  if (status) filters.push({ status });
  if (projectId) filters.push({ projectId });
  if (registeredCompanyId) filters.push({ registeredCompanyId });
  
  if (sector) {
      filters.push({
          registeredCompany: {
              sector: { equals: sector, mode: 'insensitive' }
          }
      });
  }
  if (departmentId) filters.push({ departmentId });
  
  // Legacy/Generic Group Filter (matches either Dept or Project)
  if (groupId) {
      filters.push({
          OR: [
              { departmentId: groupId },
              { projectId: groupId }
          ]
      });
  }

  if (uploaderId) filters.push({ ownerUserId: uploaderId });
  if (recordTypeId) filters.push({ recordTypeId });
  if (classificationNodeId) {
    // Deep filter: Expand selection to include all descendants (Level 1 -> 2 -> 3)
    const node = await prisma.classificationNode.findUnique({
        where: { id: classificationNodeId },
        include: { children: { include: { children: true } } }
    });

    if (node) {
        const ids = [node.id];
        node.children.forEach(c => {
            ids.push(c.id);
            if (c.children) c.children.forEach(gc => ids.push(gc.id));
        });
        
        filters.push({ classificationNodeId: { in: ids } });
    } else {
        filters.push({ classificationNodeId: 'INVALID_ID' }); 
    }
  }
  if (registeredCompanyId) filters.push({ registeredCompanyId });
  
  if (startDate || endDate) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    filters.push({ createdAt: dateFilter });
  }

  // Dynamic Metadata Filters
  searchParams.forEach((value, key) => {
      if (key.startsWith('metadata.')) {
          const fieldId = key.replace('metadata.', '');
          filters.push({
              metadata: {
                  path: [fieldId],
                  string_contains: value // Prisma JSON filter
              }
          });
      }
  });


  // 2. Access Control
  const accessClause = await getAccessibleRecordsClause((session.user as any).id);
  if (accessClause.id === 'nothing') {
     return NextResponse.json({ error: 'Permission Check Failed' }, { status: 403 });
  }

  const where = {
    AND: [
      ...filters,
      accessClause
    ]
  };

  try {
    const records = await prisma.record.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        recordType: { select: { name: true, code: true } },
        classificationNode: {
          include: {
            parent: {
              include: {
                parent: true
              }
            }
          }
        }
        // Metadata is a scalar JSONB field, no include needed
      }
    });

    return NextResponse.json(records);
  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch records', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Debug Session
  // console.log('[API] Session:', session);
  
  const userRole = (session.user as any)?.role;

  // Check upload restriction
  if (userRole !== ROLES.ADMIN) {
      try {
          const setting = await prisma.systemSetting.findUnique({ where: { key: 'ALLOW_USER_UPLOADS' } });
          // If setting exists, parse it. If not, default to true.
          // Handle potential JSON parse errors by defaulting to true (fail open for usability)
          let allowed = true;
          if (setting) {
             try {
                 allowed = JSON.parse(setting.value);
             } catch (e) {
                 console.error('Error parsing ALLOW_USER_UPLOADS setting:', e);
                 // If value is simple string "true"/"false" not in JSON format (e.g. legacy), handle it? 
                 // But JSON.parse handles "true" and "false" boolean strings.
                 allowed = true; 
             }
          }
          
          if (!allowed) {
              return NextResponse.json({ error: 'Uploads are currently disabled by the administrator.' }, { status: 403 });
          }
      } catch (e) {
          console.error('Failed to check upload restriction:', e);
          // Default to allowing if check fails to prevent blocking everyone on system error
      }
  }

  try {
    console.log('[API] POST /records - Content-Type:', request.headers.get('content-type'));
    
    let formData;
    try {
        formData = await request.formData();
    } catch (parseError: any) {
        console.error('[API] Failed to parse formData:', parseError);
        return NextResponse.json({ error: 'Invalid Form Data', details: parseError.message }, { status: 400 });
    }
    
    // Core Fields
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    // const recordTypeId = formData.get('recordTypeId') as string | null; // Allow legacy but prefer class
    const recordTypeId = formData.get('recordTypeId') as string | null;
    const classificationNodeId = formData.get('classificationNodeId') as string | null;
    const templateVersion = formData.get('templateVersion') as string | null;
    const departmentId = formData.get('departmentId') as string || undefined;
    const groupId = formData.get('groupId') as string || undefined;
    const parentId = formData.get('parentId') as string || null;
    
    // GIPC Fields
    const registeredCompanyId = formData.get('registeredCompanyId') as string || null;
    // If projectId is provided here, we treat it as the NEW Project model ID (unless it matches a group format?)
    // For safety, let's look for a specific 'gipcProjectId' or just reuse 'projectId' and check existence.
    // Given the field name collision with legacy 'projectId' (Group), let's prioritize the new 'projectId' logic
    // IF the user is using the new UI.
    const rawProjectId = formData.get('projectId') as string || null;
    
    // Versioning Fields
    const linkedRecordId = formData.get('linkedRecordId') as string | null;
    
    // Dynamic Metadata (JSON string)
    const rawMetadata = formData.get('metadata') as string;
    const metadataValues = JSON.parse(rawMetadata || '{}');

    // Final metadata to be stored - will be mapped from UUID keys to field names
    let finalMetadata: Record<string, any> = {};

    // Validation - support both old (recordTypeId) and new (classificationNodeId) systems
    if (!file || !title) {
      return NextResponse.json({ error: 'Missing required fields: file and title' }, { status: 400 });
    }

    if (!recordTypeId && !classificationNodeId) {
      return NextResponse.json({ error: 'Either recordTypeId or classificationNodeId is required' }, { status: 400 });
    }

    // If using new classification system, validate template version ONLY if provided
    // if (classificationNodeId && !templateVersion) {
    //   return NextResponse.json({ error: 'templateVersion is required when using classificationNodeId' }, { status: 400 });
    // }

    // Validate Parent Record if provided
    if (parentId) {
      const parentRecord = await prisma.record.findUnique({
        where: { id: parentId }
      });
      if (!parentRecord) {
        return NextResponse.json({ error: 'Parent record not found' }, { status: 404 });
      }
      // Optional: Check permissions on parent ID (read access required to link?)
      // For now, assuming if they have the ID and selected it (via search which filters permissions), it's okay.
    }

    // Validate classification node exists and is Level 3
    if (classificationNodeId) {
      const node = await prisma.classificationNode.findUnique({
        where: { id: classificationNodeId }
      });
      if (!node) {
        return NextResponse.json({ error: 'Classification node not found' }, { status: 404 });
      }
      if (node.level !== 3 || !node.isLeaf) {
        return NextResponse.json({ error: 'Classification node must be Level 3 (leaf node)' }, { status: 400 });
      }
      if (!node.isActive) {
        return NextResponse.json({ error: 'Classification node is not active' }, { status: 400 });
      }

      // Validate template exists IF templateVersion is provided
      if (templateVersion) {
          const template = await prisma.metadataTemplate.findFirst({
            where: {
              classificationNodeId,
              version: parseInt(templateVersion)
            },
            include: {
              templateFields: {
                include: { metadataField: true }
              }
            }
          });
          if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
          }
          if (!template.isActive) {
            return NextResponse.json({ error: 'Template is not active' }, { status: 400 });
          }
    
          // Validate required fields
          const requiredFields = template.templateFields.filter((tf: any) => tf.required);
          const missingFields = requiredFields.filter((tf: any) => {
              const val = metadataValues[tf.metadataFieldId];
              // Allow false (boolean) and 0 (number), only reject null/undefined/empty string
              return val === undefined || val === null || val === '';
          });
          if (missingFields.length > 0) {
            const fieldNames = missingFields.map((tf: any) => tf.metadataField.label);
            return NextResponse.json({
              error: `Missing required fields: ${fieldNames.join(', ')}`
            }, { status: 400 });
          }
          
          // Map Metadata: UUID -> Name for Storage
          // User Requirement: "WHERE metadata->>'amount' > 1000"
          template.templateFields.forEach((tf: any) => {
             const key = tf.metadataFieldId;
             const val = metadataValues[key];
             const fieldName = tf.metadataField.name; // e.g. "investmentAmount"

             if (val !== undefined) {
                 finalMetadata[fieldName] = val; // Store by Name
             }
          });

          // Strict template adherence - only save what is in the template
          
    } else {
         // Classification ID but NO Template?
         // Or Legacy 'recordTypeId' based?
         // If we don't have a template, we can't map names easily unless we fetch ALL fields.
         
         // If `recordTypeId` is used (Legacy Path):
         if (recordTypeId && !classificationNodeId) {
             const rt = await prisma.recordType.findUnique({
                 where: { id: recordTypeId },
                 include: { metadataFields: { include: { metadataField: true } } }
             });

             if (rt) {
                 // Map UUID keys to field names for legacy record types
                 rt.metadataFields.forEach((def: any) => {
                     const key = def.metadataField.id;
                     const val = metadataValues[key];
                     const fieldName = def.metadataField.name;
                     if (val !== undefined) finalMetadata[fieldName] = val;
                 });
             }
         }
    }
  }

    // If no mapping occurred (no template or legacy record type), use raw metadataValues
    // This ensures backwards compatibility for records without defined templates
    if (Object.keys(finalMetadata).length === 0) {
        finalMetadata = metadataValues;
    }

    // Versioning Validation & Setup
    let versionGroupId: string | undefined;
    let nextVersionNumber = 1;

    if (linkedRecordId) {
        const previousRecord = await prisma.record.findUnique({
            where: { id: linkedRecordId },
            include: { classificationNode: true }
        });

        if (!previousRecord) {
             return NextResponse.json({ error: 'Previous version record not found' }, { status: 404 });
        }

        // Validate Permissions (Must have EDIT on target)
        // Assuming `hasPermission` checks role. Ideally we check specific record access here.

        // Validate Classification Consistency
        if (classificationNodeId && previousRecord.classificationNodeId !== classificationNodeId) {
             // Optional: Allow override? For now, enforce same classification for versions to prevent confusion.
             return NextResponse.json({ error: 'New version must belong to the same classification as the original record' }, { status: 400 });
        }

        // Determine Version Group
        versionGroupId = previousRecord.versionGroupId || crypto.randomUUID(); // If null, start a new group
        
        // Version Number is now calculated INSIDE the transaction to prevent races.
    } else {
        // New Record -> New Version Group
        versionGroupId = crypto.randomUUID();
    }

    // Pre-generate Record ID for Immutable Path
    const newRecordId = crypto.randomUUID();

    // Snapshot Company Details
    let companySnapshotName: string | undefined;
    let companySnapshotRegNo: string | undefined;
    let contextType = 'NONE';

    if (registeredCompanyId) {
        const company = await prisma.registeredCompany.findUnique({
            where: { id: registeredCompanyId }
        });
        if (company) {
            companySnapshotName = company.name;
            companySnapshotRegNo = company.registrationNumber;
            contextType = 'COMPANY';
        }
    } else if (rawProjectId) {
        // If primarily linked to a project (and no company), context is PROJECT
        contextType = 'PROJECT';
    }

    // Upload File (MinIO/S3)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Calculate SHA-256 Checksum for Integrity
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    const calculatedChecksum = hash.digest('hex');
    
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    // Immutable Path: records/{id}/v{version}/{filename}
    // Note: We use the pre-generated newRecordId
    const s3Key = `records/${newRecordId}/v${nextVersionNumber}/${fileName}`;
    
    // Put to Bucket
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
    }));

    // Generate URL (for localhost access)
    // Note: getPublicUrl needs to handle the directory structure. 
    // Assuming getPublicUrl just prepends the bucket URL or handles relative paths.
    const fileUrl = getPublicUrl(s3Key);

    const userId = (session.user as any).id;

    // Retry Logic for Versioning Race Condition
    const MAX_RETRIES = 3;
    let result;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // Transactional Create
            result = await prisma.$transaction(async (tx: any) => {

              // Resolve RecordType ID from Classification Node if not provided explicitly
              let appliedRecordTypeId = recordTypeId;
              if (classificationNodeId && !appliedRecordTypeId) {
                 const linkedRecordType = await tx.recordType.findUnique({
                     where: { classificationNodeId }
                 });
                 if (linkedRecordType) {
                     appliedRecordTypeId = linkedRecordType.id;
                 }
              }

              // --- MOVED INSIDE TRANSACTION FOR SAFETY ---
              // Determine Version Number (Inside Lock if possible, or just closer to write)
              let nextVersionNumber = 1;

              if (linkedRecordId && versionGroupId) {
                 // IDEAL SOLUTION: Explicit Row Locking to prevent race conditions
                 // We lock the rows for this versionGroup so no one else can insert/update until we are done.
                 // Note: Using standard Prisma model names which usually map to "ModelName" in Postgres.
                 try {
                     const result: any[] = await tx.$queryRaw`
                        SELECT "versionNumber" 
                        FROM "Record" 
                        WHERE "versionGroupId" = ${versionGroupId} 
                        ORDER BY "versionNumber" DESC 
                        LIMIT 1 
                        FOR UPDATE
                     `;
                     
                     const currentMax = result.length > 0 ? result[0].versionNumber : 0;
                     nextVersionNumber = currentMax + 1;
                 } catch (e) {
                     console.error('Locking query failed, falling back to aggregate (less safe):', e);
                     // Fallback if raw query fails (e.g. table name mismatch)
                     const maxVer = await tx.record.aggregate({
                         where: { versionGroupId },
                         _max: { versionNumber: true }
                     });
                     nextVersionNumber = (maxVer._max.versionNumber || 0) + 1;
                 }
              }
              // -------------------------------------------

              let referenceNumber: string | undefined = undefined;

              // Generate Reference Number if using 3-Level Classification
              if (classificationNodeId) {
                // Fetch full hierarchy to build code
                // We need L3 (this node), L2 (parent), and L1 (grandparent)
                // Note: We need to fetch it within the transaction? 
                // No, we can fetch, but we MUST increment atomically.
                // Let's simplified fetching logic since we are in a transaction.
                
                // 1. Increment Sequence (and get new value + parentId)
                const updatedNode = await tx.classificationNode.update({
                  where: { id: classificationNodeId },
                  data: { lastSequenceNumber: { increment: 1 } },
                  include: {
                    parent: {
                      include: {
                        parent: true
                      }
                    }
                  }
                });

                const l3 = updatedNode;
                const l2 = l3.parent;
                const l1 = l2?.parent;

                if (l3 && l2 && l1) {
                     const c1 = l1.code || l1.name.substring(0, 3).toUpperCase();
                     const c2 = l2.code || l2.name.substring(0, 3).toUpperCase();
                     const c3 = l3.code || l3.name.substring(0, 3).toUpperCase();
                     const seq = String(l3.lastSequenceNumber).padStart(4, '0');
                     referenceNumber = `${c1}-${c2}-${c3}-${seq}`;
                }
              }

              // Calculate Disposition Date (Retention)
              // PRIORITY: Classification Node Policy > Record Type Policy
              let dispositionDate: Date | undefined;
              let usedRetentionPolicyId: string | undefined = undefined;

              // 1. Try Classification Policy
              if (classificationNodeId) {
                  const node = await tx.classificationNode.findUnique({
                      where: { id: classificationNodeId },
                      select: { 
                          retentionPolicy: {
                              select: { id: true, durationValue: true, durationUnit: true }
                          }
                      }
                  });
                  if (node && node.retentionPolicy) {
                      const rp = node.retentionPolicy;
                      usedRetentionPolicyId = rp.id;
                      
                      if (rp.durationValue && rp.durationUnit === 'YEARS') {
                            const now = new Date();
                            dispositionDate = new Date(now);
                            dispositionDate.setFullYear(now.getFullYear() + rp.durationValue);
                      } else if (rp.durationValue && rp.durationUnit === 'MONTHS') {
                            const now = new Date();
                            dispositionDate = new Date(now);
                            dispositionDate.setMonth(now.getMonth() + rp.durationValue);
                      } else if (rp.durationValue && rp.durationUnit === 'DAYS') {
                            const now = new Date();
                            dispositionDate = new Date(now);
                            dispositionDate.setDate(now.getDate() + rp.durationValue);
                      }
                      // PERMANENT = undefined / null dispositionDate
                  }
              }

              // 2. Fallback to Record Type Policy (if no classification policy found)
              if (!dispositionDate && !usedRetentionPolicyId && recordTypeId) {
                  const rt = await tx.recordType.findUnique({ 
                      where: { id: recordTypeId },
                      select: { retentionYears: true, retentionPolicy: true }
                  });
                  
                  // Legacy simple int
                  if (rt && rt.retentionYears) {
                      const now = new Date();
                      dispositionDate = new Date(now);
                      dispositionDate.setFullYear(now.getFullYear() + rt.retentionYears);
                  }
                  // Or linked policy
                  else if (rt && rt.retentionPolicy) {
                       // ... similar logic ... for now relying on simple retentionYears as that was the legacy schema
                  }
              }

              // Determine Initial Status & Validate Lifecycle
              const rawUserRole = (session.user as any)?.role;
              const formStatus = formData.get('status') as string;
              
              // Default to DRAFT, unless user requested something else (handled by assert)
              let targetStatus: any = 'DRAFT';
              
              if (formStatus && ['DRAFT', 'REGISTERED'].includes(formStatus)) {
                  targetStatus = formStatus;
              } else if (hasPermission(rawUserRole, 'REGISTER_RECORD')) {
                  targetStatus = 'REGISTERED';
              }

              // Assert this creation is valid
              // assertTransitionAllowed will throw if User tries to create ACTIVE
              try {
                assertTransitionAllowed(null, targetStatus, rawUserRole);
              } catch (e: any) {
                  // Re-throw so it's caught by the retry logic (though logically no point retrying this error).
                  // But we need to distinguish errors.
                  throw e; 
              }

              const initialStatus = targetStatus;
              const verificationBypassed = (initialStatus === 'ACTIVE');

              // 1. Create Record Container
              // Legacy Group Project logic:
              let legacyProjectId: string | undefined = undefined;
              let newProjectId: string | undefined = undefined;

              if (rawProjectId) {
                 // Check if this ID belongs to the new Project table
                 const proj = await tx.project.findUnique({ where: { id: rawProjectId } });
                 if (proj) {
                     newProjectId = rawProjectId;
                 } else {
                     // Fallback to legacy Group check? Or just assign to legacy field if it matches group logic?
                 }
              }
              
              // Map groupId to legacyProjectId if it wasn't a new Project
              if (groupId && !newProjectId) {
                  legacyProjectId = groupId;
              }

              // Handle Versioning Updates (if linked)
              if (linkedRecordId && versionGroupId) {
                   // 1. If previous record didn't have a group ID, update it now
                   // This handles the migration case where old records have null groupId
                   await tx.record.updateMany({
                       where: { 
                           OR: [
                               { id: linkedRecordId },
                               { versionGroupId } 
                           ],
                           isLatest: true
                       },
                       data: { isLatest: false }
                   });
                   
                   // If the linked record was "standalone" (no groupId), we need to update it to belong to this group
                   // AND if we just created the group ID for it.
                   const prev = await tx.record.findUnique({ where: { id: linkedRecordId }, select: { versionGroupId: true }});
                   if (!prev?.versionGroupId) {
                       await tx.record.update({
                           where: { id: linkedRecordId },
                           data: { versionGroupId, isLatest: false }
                       });
                   }
              }

              const record = await tx.record.create({
                data: {
                  id: newRecordId, // Explicitly set ID
                  title,
                  status: initialStatus,
                  ...(appliedRecordTypeId && { recordType: { connect: { id: appliedRecordTypeId } } }), // Legacy support linked to Classification
                  ...(classificationNodeId && {
                    classificationNode: { connect: { id: classificationNodeId } },
                    templateVersion: templateVersion ? parseInt(templateVersion) : undefined,
                  }),
                  ...(departmentId && { department: { connect: { id: departmentId } } }), // Optional
                  ...(legacyProjectId && { project: { connect: { id: legacyProjectId } } }),   // Legacy Group Link
                  ...(registeredCompanyId && { registeredCompany: { connect: { id: registeredCompanyId } } }), // GIPC Company Link
                  ...(userId && { user: { connect: { id: userId } } }),
                  referenceNumber, // Generated ID
                  ...(parentId && { parent: { connect: { id: parentId } } }),
                  dispositionDate, // calculated
                  ...(usedRetentionPolicyId && { retentionPolicy: { connect: { id: usedRetentionPolicyId } } }),
                  
                  // Context & Snapshots
                  contextType: contextType || 'NONE',
                  companySnapshotRegNo,
                  
                  // Metadata (JSONB)
                  metadata: finalMetadata,

                  // Versioning
                  versionGroupId,
                  versionNumber: nextVersionNumber,
                  isLatest: true,
                }
              });

              // 2. Create InitialVersion
              await tx.recordVersion.create({
                data: {
                  recordId: record.id,
                  versionNumber: nextVersionNumber,  // Use the calculated version
                  filePath: fileUrl,
                  fileType: file.type || 'unknown',
                  uploadedById: userId,
                  checksum: calculatedChecksum, // Store SHA-256
                  changeNote: 'Initial Upload'
                }
              });

              // 3. Metadata persistence handled via JSONB column in record.create
              // (Old recordMetadata.createMany removed)

              // 3b. Create ProjectRecord Link (GIPC)
              if (newProjectId) {
                  await tx.projectRecord.create({
                      data: {
                          projectId: newProjectId,
                          recordId: record.id,
                          addedById: userId,
                          versionGroupId
                      }
                  });
              }

              // 4. Access Control (Shared Users & Groups)
              const rawSharedUsers = formData.get('sharedUsers');
              const rawSharedGroups = formData.get('sharedGroups');
              const visibility = formData.get('visibility') as string;

              let sharedUsers: string[] = [];
              let sharedGroups: string[] = [];
              
              try {
                  if (rawSharedUsers) {
                     sharedUsers = JSON.parse(rawSharedUsers as string);
                  }
                  if (rawSharedGroups) {
                     sharedGroups = JSON.parse(rawSharedGroups as string);
                  }

                  // Handle Visibility Shortcuts (Organization-Wide)
                  if (visibility === 'PUBLIC') {
                      if (!sharedGroups.includes(EVERYONE_GROUP_ID)) {
                          sharedGroups.push(EVERYONE_GROUP_ID);
                      }
                  }

              } catch (e) { console.error('[API] Error parsing access JSON:', e); }

              // Create Explicit Access Entries
              if (sharedUsers.length > 0) {
                  try {
                      const res = await tx.recordAccess.createMany({
                          data: sharedUsers.map(uid => ({
                              recordId: record.id,
                              principalType: 'USER',
                              userId: uid,
                              level: 'VIEW', // Default level for shared
                              accessType: AccessType.ALLOW
                          }))
                      });
                  } catch (accessErr) {
                      throw accessErr; // Re-throw to fail transaction (so we see the error in frontend)
                  }
              }

              if (sharedGroups.length > 0) {
                  try {
                      await tx.recordAccess.createMany({
                          data: sharedGroups.map(gid => ({
                              recordId: record.id,
                              principalType: 'GROUP',
                              groupId: gid,
                              level: 'VIEW',
                              accessType: AccessType.ALLOW
                          }))
                      });
                  } catch (accessErr) {
                       throw accessErr;
                  }
              }

              // 4. Audit Log
              await tx.auditLog.create({
                data: {
                  action: 'UPLOAD',
                  recordId: record.id,
                  userId: userId,
                  actorRole: rawUserRole,
                  source: 'API',
                  newValue: JSON.stringify({
                    title,
                    status: initialStatus,
                    verificationBypassed,
                    projectId: newProjectId || legacyProjectId,
                    ...(appliedRecordTypeId && { recordTypeId: appliedRecordTypeId }),
                    ...(classificationNodeId && { classificationNodeId, templateVersion }),
                    versionGroupId,
                    versionNumber: nextVersionNumber
                  })
                }
              });

              return record;
            }); // End Transaction

            // If we reached here, Break the loop (success)
            break; 

        } catch (err: any) {
            // Check for Prisma Unique Constraint Violation on Record(versionGroupId, versionNumber)
            if (err.code === 'P2002' && err.meta?.target?.includes('versionGroupId') && err.meta?.target?.includes('versionNumber')) {
                 console.warn(`[API] Version Race Condition detected on attempt ${attempt + 1}. Retrying...`);
                 if (attempt >= MAX_RETRIES - 1) {
                     throw err; // Re-throw if last attempt
                 }
                 // Wait a tiny bit (backoff)
                 await new Promise(r => setTimeout(r, 100 * (attempt + 1))); 
                 continue; // Retrieve transaction
            } else {
                 throw err; // Re-throw other errors
            }
        }
    }
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Upload Error:', error);
    
    // Handle Prisma Unique Constraint Violation
    // This specific P2002 for versioning is now handled by the retry loop.
    // Any other P2002 would be caught here.
    if (error.code === 'P2002') {
        return NextResponse.json({ 
            error: 'Concurrent version update detected. Please try uploading again.',
            details: 'Version Race Condition'
        }, { status: 409 });
    }

    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
  }
}
