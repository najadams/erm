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
             select: { id: true, title: true, referenceNumber: true, status: true, recordType: { select: { name: true } } }
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
        metadata: {
          include: { metadataField: true }
        },
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

    let project = null;
    if ((record as any).projectId) {
        project = await prisma.group.findUnique({ 
            where: { id: (record as any).projectId },
            select: { id: true, name: true }
        });
    }

    return NextResponse.json({ ...record, project });
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
      const { status } = body;
      
      // We only support Status update for now via this specific route usage?
      // Or should we support metadata update? 
      // For Governance Automation, we need Status update.
      
      if (!status) {
          return NextResponse.json({ error: 'Only status updates supported currently' }, { status: 400 });
      }

      // 1. Fetch current
      const record = await prisma.record.findUnique({
          where: { id }
      });

      if (!record) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      // 2. Validate Transition
      try {
          // Cast string to RecordStatus (runtime check is inside assertTransitionAllowed via STATE_TRANSITIONS)
          // But TS needs help.
          assertTransitionAllowed(
              record.status as RecordStatus, 
              status as RecordStatus, 
              user.role
          );
      } catch (e: any) {
          return NextResponse.json({ error: e.message }, { status: 403 });
      }

      // 3. Update
      const updated = await prisma.record.update({
          where: { id },
          data: { status }
      });

      // 4. Audit
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

      return NextResponse.json(updated);

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
