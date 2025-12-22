import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { hasPermission } from '@/lib/permissions';

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
  const groupId = searchParams.get('groupId') || searchParams.get('department');
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
        { description: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
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
  if (groupId) filters.push({ groupId });
  if (uploaderId) filters.push({ ownerUserId: uploaderId });
  if (recordTypeId) filters.push({ recordTypeId });
  if (classificationNodeId) filters.push({ classificationNodeId });
  
  if (startDate || endDate) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    filters.push({ createdAt: dateFilter });
  }

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

  try {
    const formData = await request.formData();
    
    // Core Fields
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const recordTypeId = formData.get('recordTypeId') as string | null;
    const classificationNodeId = formData.get('classificationNodeId') as string | null;
    const templateVersion = formData.get('templateVersion') as string | null;
    const departmentId = formData.get('departmentId') as string || undefined;
    const groupId = formData.get('groupId') as string || undefined;
    const parentId = formData.get('parentId') as string || null;
    
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
          const requiredFields = template.templateFields.filter(tf => tf.required);
          const missingFields = requiredFields.filter(tf => !metadataValues[tf.metadataFieldId]);
          if (missingFields.length > 0) {
            const fieldNames = await prisma.metadataField.findMany({
              where: { id: { in: missingFields.map(tf => tf.metadataFieldId) } },
              select: { label: true }
            });
            return NextResponse.json({
              error: `Missing required fields: ${fieldNames.map(f => f.label).join(', ')}`
            }, { status: 400 });
          }
      }
    }

    // Upload File (MinIO/S3)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
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
    const result = await prisma.$transaction(async (tx) => {

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

      // Determine Initial Status based on Role & Permissions
      const rawUserRole = (session.user as any)?.role;
      // Note: mapping handled inside hasPermission, but we might want the mapped role for other logic if needed.
      // But hasPermission takes raw string and maps it internally.
      
      const canVerify = hasPermission(rawUserRole, 'VERIFY_RECORD');
      
      let initialStatus = 'DRAFT';
      let verificationBypassed = false;

      if (canVerify) {
         // If user can verify, allow them to set ACTIVE immediately
         const formStatus = formData.get('status') as string;
         if (formStatus && ['DRAFT', 'ACTIVE'].includes(formStatus)) {
             initialStatus = formStatus;
         } else {
             // Default for Verify-capable users (Direct Upload)
             initialStatus = 'ACTIVE'; 
         }
         
         if (initialStatus === 'ACTIVE') {
             verificationBypassed = true;
         }
      }

      // 1. Create Record Container
      const record = await tx.record.create({
        data: {
          title,
          status: initialStatus,
          ...(recordTypeId && { recordTypeId }), // Legacy support
          ...(classificationNodeId && {
            classificationNodeId,
            templateVersion: templateVersion ? parseInt(templateVersion) : undefined,
          }),
          departmentId, // Optional
          ownerUserId: userId,
          referenceNumber, // Generated ID
          parentId,
        }
      });

      // 2. Create Initial Version
      await tx.recordVersion.create({
        data: {
          recordId: record.id,
          versionNumber: 1,
          filePath: fileUrl,
          fileType: file.type || 'unknown',
          uploadedById: userId,
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

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          action: 'UPLOAD',
          recordId: record.id,
          userId: userId,
          newValue: JSON.stringify({
            title,
            status: initialStatus,
            verificationBypassed,
            ...(recordTypeId && { recordTypeId }),
            ...(classificationNodeId && { classificationNodeId, templateVersion })
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
