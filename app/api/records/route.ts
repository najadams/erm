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

  // 1. Build Search/Filter Clause
  const filters: any[] = [];

  if (q) {
    filters.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        // Search by User Name
        { user: { name: { contains: q, mode: 'insensitive' } } },
        // Search in metadata values
        { 
            metadata: { 
                some: { value: { contains: q, mode: 'insensitive' } } 
            } 
        }
      ]
    });
  }

  if (status) filters.push({ status });
  if (projectId) filters.push({ projectId });
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
  if (classificationNodeId) filters.push({ classificationNodeId });
  
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
                  some: {
                      metadataFieldId: fieldId,
                      value: { contains: value, mode: 'insensitive' }
                  }
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
        },
        metadata: {
            include: { metadataField: true }
        }
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
    
    // Versioning Fields
    const linkedRecordId = formData.get('linkedRecordId') as string | null;
    
    // Dynamic Metadata (JSON string)
    const rawMetadata = formData.get('metadata') as string;
    const metadataValues = JSON.parse(rawMetadata || '{}');

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
              templateFields: true
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
            const fieldNames = await prisma.metadataField.findMany({
              where: { id: { in: missingFields.map((tf: any) => tf.metadataFieldId) } },
              select: { label: true }
            });
            return NextResponse.json({
              error: `Missing required fields: ${fieldNames.map((f: any) => f.label).join(', ')}`
            }, { status: 400 });
          }
      }
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
        // Assuming `hasPermission` checks role, but for specific record access we might need `getAccessibleRecordsClause` equivalent or direct check.
        // For MVP/Speed, we rely on the fact that the user could SEE the record to select it (via search) and we check global CREATE/EDIT permissions.
        // Ideally: await checkRecordAccess(userId, linkedRecordId, 'EDIT');

        // Validate Classification Consistency
        if (classificationNodeId && previousRecord.classificationNodeId !== classificationNodeId) {
             // Optional: Allow override? For now, enforce same classification for versions to prevent confusion.
             return NextResponse.json({ error: 'New version must belong to the same classification as the original record' }, { status: 400 });
        }

        // Determine Version Group
        versionGroupId = previousRecord.versionGroupId || crypto.randomUUID(); // If null, start a new group
        
        // Determine Version Number
        // We generally increment based on the *max* in the group, to avoid race conditions or branching.
        // If we just generated a new GroupId, we are V2 (prev is V1 implicitly).
        if (!previousRecord.versionGroupId) {
             nextVersionNumber = (previousRecord.versionNumber || 1) + 1;
        } else {
             // Find max version in this group
             const maxVer = await prisma.record.aggregate({
                 where: { versionGroupId },
                 _max: { versionNumber: true }
             });
             nextVersionNumber = (maxVer._max.versionNumber || 1) + 1;
        }
    } else {
        // New Record -> New Version Group
        versionGroupId = crypto.randomUUID();
    }

    // Upload File (MinIO/S3)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Calculate SHA-256 Checksum for Integrity
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    const calculatedChecksum = hash.digest('hex');
    
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    
    // Put to Bucket
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
    }));

    // Generate URL (for localhost access)
    const fileUrl = getPublicUrl(fileName);

    const userId = (session.user as any).id;

    // Transactional Create
    const result = await prisma.$transaction(async (tx: any) => {

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
      // Currently only supporting simple retention via RecordType
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
      
      if (formStatus && ['DRAFT', 'ACTIVE'].includes(formStatus)) {
          targetStatus = formStatus;
      } else if (hasPermission(rawUserRole, 'VERIFY_RECORD')) {
          targetStatus = 'ACTIVE'; 
      }

      // Assert this creation is valid
      // assertTransitionAllowed will throw if User tries to create ACTIVE
      try {
        assertTransitionAllowed(null, targetStatus, rawUserRole);
      } catch (e: any) {
          return NextResponse.json({ error: e.message }, { status: 403 });
      }

      const initialStatus = targetStatus;
      const verificationBypassed = (initialStatus === 'ACTIVE');

      // 1. Create Record Container
      // Map groupId to projectId if it's a valid Group ID (assuming UI sends groupId for project context)
      // Note: We should probably validate if the group is actually a project, but for now we map it.
      const projectId = groupId;

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
           // Actually, it's safer to just look for the record by ID and update it if needed.
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
          title,
          status: initialStatus,
          ...(appliedRecordTypeId && { recordTypeId: appliedRecordTypeId }), // Legacy support linked to Classification
          ...(classificationNodeId && {
            classificationNodeId,
            templateVersion: templateVersion ? parseInt(templateVersion) : undefined,
          }),
          departmentId, // Optional
          projectId,   // New: Project/Case Link
          ownerUserId: userId,
          referenceNumber, // Generated ID
          parentId,
          dispositionDate, // calculated
          retentionPolicyId: usedRetentionPolicyId,
          
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
          versionNumber: 1,
          filePath: fileUrl,
          fileType: file.type || 'unknown',
          uploadedById: userId,
          checksum: calculatedChecksum, // Store SHA-256
          changeNote: 'Initial Upload'
        }
      });

      // 3. Insert Metadata
      // We expect metadataValues to be { [fieldId]: "value" }
      const metadataEntries = Object.entries(metadataValues).map(([fieldId, value]) => ({
        recordId: record.id,
        metadataFieldId: fieldId,
        value: String(value)
      }));

      if (metadataEntries.length > 0) {
        await tx.recordMetadata.createMany({
          data: metadataEntries
        });
      }

      // 4. Access Control (Shared Users & Groups)
      // Parse JSON from formData (safely)
      const rawSharedUsers = formData.get('sharedUsers');
      const rawSharedGroups = formData.get('sharedGroups');
      const visibility = formData.get('visibility') as string; // 'PRIVATE', 'DEPARTMENT', 'SHARED', 'PUBLIC'

      let sharedUsers: string[] = [];
      let sharedGroups: string[] = [];
      
      try {
          if (rawSharedUsers) {
             sharedUsers = JSON.parse(rawSharedUsers as string);
             console.log('[API] Parsed sharedUsers:', sharedUsers.length, sharedUsers);
          }
          if (rawSharedGroups) {
             sharedGroups = JSON.parse(rawSharedGroups as string);
             console.log('[API] Parsed sharedGroups:', sharedGroups.length, sharedGroups);
          }

          // Handle Visibility Shortcuts (Organization-Wide)
          if (visibility === 'PUBLIC') {
              console.log('[API] Visibility PUBLIC: Adding Everyone Group Access');
              if (!sharedGroups.includes(EVERYONE_GROUP_ID)) {
                  sharedGroups.push(EVERYONE_GROUP_ID);
              }
          }

      } catch (e) { console.error('[API] Error parsing access JSON:', e); }

      // Create Explicit Access Entries
      if (sharedUsers.length > 0) {
          console.log('[API] Creating RecordAccess for Users...');
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
              console.log('[API] RecordAccess Created (Users):', res.count);
          } catch (accessErr) {
              console.error('[API] CRITICAL: Failed to create User RecordAccess:', accessErr);
              throw accessErr; // Re-throw to fail transaction (so we see the error in frontend)
          }
      } else {
          console.log('[API] No sharedUsers to add.');
      }

      if (sharedGroups.length > 0) {
          console.log('[API] Creating RecordAccess for Groups...');
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
              console.log('[API] RecordAccess Created (Groups)');
          } catch (accessErr) {
               console.error('[API] CRITICAL: Failed to create Group RecordAccess:', accessErr);
               throw accessErr;
          }
      }
      
      // Handle Visibility Shortcuts
      // If 'DEPARTMENT' visibility, ensure departmentId is set (it should be from form, but we can double check logic)
      // If 'PUBLIC', maybe create a special group access? For now, we assume 'PUBLIC' means wide open which might be handled by ACS logic checking for a 'PUBLIC' flag if we had one.
      // Current ACS logic relies on RecordAccess or Ownership/Dept/Project.
      // If visibility is 'DEPARTMENT' and no departmentId was set, we might have an issue, but frontend validates that.

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
            projectId,
            ...(appliedRecordTypeId && { recordTypeId: appliedRecordTypeId }),
            ...(classificationNodeId && { classificationNodeId, templateVersion }),
            versionGroupId,
            versionNumber: nextVersionNumber
          })
        }
      });

      return record;
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
  }
}
