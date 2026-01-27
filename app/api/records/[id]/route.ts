import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasPermission } from '@/lib/permissions';

import { assertTransitionAllowed, RecordStatus } from '@/lib/lifecycle';
import { canAccessRecord } from '@/lib/access'; // Kept for compatibility if other funcs used, but we prefer ACS
import { ACS } from '@/lib/acs';

// Note: In a real app, use the same access control clause as the list view.
// For now, we'll do a simple check.

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const id = params.id;
    // 1. Permission Check via Unified ACS
    const hasAccess = await ACS.evaluate((session.user as any).id, id, 'VIEW');
    
    // Fetch limited info if access denied
    if (!hasAccess) {
        const limitedRecord = await prisma.record.findUnique({
             where: { id },
             select: { 
                 id: true, 
                 title: true, 
                 referenceNumber: true, 
                 status: true, 
                 recordType: { select: { name: true } },
                 registeredCompany: { select: { id: true, name: true } } 
             }
        });
        
        if (!limitedRecord) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

        return NextResponse.json({ 
            error: 'Forbidden', 
            details: 'You do not have permission to view this record.',
            limitedInfo: limitedRecord 
        }, { status: 403 });
    }

    const record = await prisma.record.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },

        recordType: {
          include: {
            metadataFields: {
              include: { metadataField: true },
              orderBy: { displayOrder: 'asc' }
            }
          }
        },

        // metadata scalar automatically included
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { uploadedBy: { select: { name: true } } }
        },
        parent: {
            select: { id: true, title: true, referenceNumber: true }
        },
        department: { select: { id: true, name: true } },
        // Access list removed for security. Use /api/records/:id/access
      }
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const canDownload = await ACS.evaluate((session.user as any).id, id, 'COMMENT');

    let project = null;
    if ((record as any).projectId) {
        project = await prisma.group.findUnique({ 
            where: { id: (record as any).projectId },
            select: { id: true, name: true }
        });
    }

    // Sanitize response based on download permission
    const responseData = { ...record, project, canDownload };
    if (!canDownload) {
        responseData.versions = responseData.versions.map((v: any) => ({
            ...v,
            filePath: null
        }));
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Fetch Record Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const user = session.user as any;
  
  try {
      const body = await request.json();
      const { status, metadata } = body;
      
      if (!status && !metadata) {
          return NextResponse.json({ error: 'No fields to update provided' }, { status: 400 });
      }

      // 1. Fetch current record with Metadata
      const record = await prisma.record.findUnique({
          where: { id },
          include: { recordType: true } // Need type? Maybe not if just generic validation.
      });

      if (!record) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      // --- STATUS UPDATE ---
      if (status) {
          try {
              assertTransitionAllowed(
                  record.status as RecordStatus, 
                  status as RecordStatus, 
                  user.role
              );
          } catch (e: any) {
              return NextResponse.json({ error: e.message }, { status: 403 });
          }

          const updated = await prisma.record.update({
              where: { id },
              data: { status }
          });

          await prisma.auditLog.create({
              data: {
                  action: 'UPDATE_STATUS',
                  recordId: id,
                  userId: user.id,
                  actorRole: user.role,
                  source: 'API',
                  oldValue: record.status,
                  newValue: status
              }
          });
          
          if (!metadata) return NextResponse.json(updated);
      }

      // --- METADATA UPDATE ---
      if (metadata) {
          // 1. Validation (Zod)
          const { validateMetadata, IMMUTABLE_FIELDS_WHEN_REGISTERED, validateMetadataField } = await import('@/lib/metadata-validation');
          
          let validatedMetadata: any = {};
          try {
              // We support partial updates? Or full? 
              // Usually PATCH is partial.
              // So validate each field individually.
              Object.entries(metadata).forEach(([k, v]) => {
                  validatedMetadata[k] = validateMetadataField(k, v);
              });
          } catch (e: any) {
               return NextResponse.json({ error: e.message }, { status: 400 });
          }

          // 2. Immutability Check
          const LOCKED_STATES = ['REGISTERED', 'ACTIVE', 'ARCHIVED', 'LOCKED'];
          const isLocked = LOCKED_STATES.includes(record.status);
          const isAdmin = hasPermission(user.role, 'MANAGE_USERS'); // Admin proxy
          
          if (isLocked && !isAdmin) {
              const changedImmutableFields = Object.keys(validatedMetadata).filter(key => {
                  if (IMMUTABLE_FIELDS_WHEN_REGISTERED.includes(key)) {
                      // Check if value actually changed
                      const oldVal = (record.metadata as any)?.[key];
                      const newVal = validatedMetadata[key];
                      return JSON.stringify(oldVal) !== JSON.stringify(newVal);
                  }
                  return false;
              });

              if (changedImmutableFields.length > 0) {
                  return NextResponse.json({ 
                      error: `Cannot modify immutable fields in ${record.status} state: ${changedImmutableFields.join(', ')}` 
                  }, { status: 403 });
              }
          }

          // 3. Diff for Audit
          const auditEntries: any[] = [];
          const oldMetadata = (record.metadata || {}) as Record<string, any>;
          const newMergedMetadata = { ...oldMetadata, ...validatedMetadata };

          Object.keys(validatedMetadata).forEach(key => {
              const oldVal = oldMetadata[key];
              const newVal = validatedMetadata[key];
              if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                  auditEntries.push({
                      action: 'UPDATE_METADATA',
                      recordId: id,
                      userId: user.id,
                      actorRole: user.role,
                      source: 'API',
                      metadata: { field: key }, // Store field name in metadata col? Or just in details?
                      oldValue: String(oldVal), // potential truncation if huge
                      newValue: String(newVal)
                  });
              }
          });

          if (auditEntries.length > 0) {
              await prisma.$transaction([
                  prisma.record.update({
                      where: { id },
                      data: { metadata: newMergedMetadata }
                  }),
                  prisma.auditLog.createMany({ data: auditEntries })
              ]);
          }

          return NextResponse.json({ success: true, changes: auditEntries.length });
      }
      
      return NextResponse.json({ success: true });

  } catch (error: any) {
      console.error('Update Error:', error);
      return NextResponse.json({ error: 'Update failed', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const user = session.user as any;
    const userId = user.id;
    const userRole = user.role;

    try {
        // 1. Fetch Record to check status
        const record = await prisma.record.findUnique({
            where: { id },
            select: { id: true, status: true, ownerUserId: true, title: true, isLegalHold: true } // Fetch minimal + hold status
        });

        if (!record) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        // 1.5 Legal Hold Block (Overrides everything)
        if (record.isLegalHold) {
             return NextResponse.json({ 
                 error: `Cannot delete. Record is subject to an active Legal Hold.` 
             }, { status: 403 });
        }

        // 2. Strict Lifecycle Safeguard
        const LOCKED_STATES = ['ACTIVE', 'VERIFIED', 'ARCHIVED', 'DISPOSED'];
        if (record.status && LOCKED_STATES.includes(record.status)) {
             return NextResponse.json({ 
                 error: `Cannot delete Official Record in '${record.status}' state. This requires a formal Disposition process.` 
             }, { status: 403 });
        }

        // 3. Permission Checks for Drafts/Submitted
        const isOwner = record.ownerUserId === userId;
        const canDelete = hasPermission(userRole, 'WORKSPACE_DELETE_OWN_DRAFT');
        const isAdmin = hasPermission(userRole, 'MANAGE_USERS'); // Proxy for Admin power, or check specific DELETE perm

        if (record.status === 'DRAFT') {
            if (!isOwner && !isAdmin) {
                return NextResponse.json({ error: 'You can only delete your own drafts.' }, { status: 403 });
            }
        } 
        // Allow deleting Submitted if you are admin/approver? (Rejecting usually sets back to draft, but hard delete might be needed)
        
        // 4. Perform Deletion
        // Note: This will likely cascade delete Metadata/Versions/AuditLogs depending on Schema.
        // Ideally AuditLogs should refer to Record as Optional and SetNull on delete.
        // Let's assume schema handles cascading or we transactionally delete.
        
        // Transaction: Create Audit Log (orphaned) -> Delete Record
        await prisma.$transaction(async (tx: any) => {
             // Create Audit Log of deletion (must be before delete if we want to snapshot, 
             // but 'recordId' will be nullified if foreign key restricted, or we leave it as string?)
             // Schema: recordId String? relation... onDelete: SetNull usually.
             
             await tx.auditLog.create({
                 data: {
                     action: 'DELETE',
                     userId: userId,
                     actorRole: userRole,
                     source: 'API',
                     newValue: JSON.stringify({
                         title: record.title,
                         status: record.status,
                         deletedAt: new Date().toISOString()
                     })
                     // recordId intentionally left null or if we set it, it becomes null upon delete
                 }
             });

             await tx.record.delete({ where: { id } });
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Delete failed', details: error.message }, { status: 500 });
    }
}
