
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasPermission } from '@/lib/permissions';
import { assertTransitionAllowed } from '@/lib/lifecycle';

export async function POST(
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
      const { versionId } = body;
      
      if (!versionId) {
          return NextResponse.json({ error: 'versionId required' }, { status: 400 });
      }

      // 1. Fetch Record & Version
      const record = await prisma.record.findUnique({
          where: { id },
          include: { versions: { orderBy: { versionNumber: 'desc' } } }
      });

      if (!record) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      const latestVersion = record.versions[0];
      const targetVersion = record.versions.find((v: any) => v.id === versionId);

      if (!targetVersion) {
          return NextResponse.json({ error: 'Target version not found' }, { status: 404 });
      }

      // 2. Permission Check (Can they edit/upload?)
      // Use existing permissions or ownership
      const isOwner = record.ownerUserId === user.id;
      const canEdit = isOwner || hasPermission(user.role, 'MANAGE_USERS'); // Approximation
      
      if (!canEdit) {
           return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }

      // 3. Lifecycle Check (Can we modify this record?)
      // If it's ARCHIVED or DISPOSED, usually no.
      if (['ARCHIVED', 'DISPOSED'].includes(record.status)) {
           return NextResponse.json({ error: 'Cannot restore version for Archived/Disposed record' }, { status: 403 });
      }

      // 4. Create New Version
      const newVersionNum = (latestVersion?.versionNumber || 0) + 1;
      
      await prisma.$transaction(async (tx: any) => {
           await tx.recordVersion.create({
               data: {
                   recordId: id,
                   versionNumber: newVersionNum,
                   filePath: targetVersion.filePath,
                   fileType: targetVersion.fileType,
                   uploadedById: user.id,
                   changeNote: `Restored from Version ${targetVersion.versionNumber}`
               }
           });

           // Audit
           await tx.auditLog.create({
              data: {
                  action: 'RESTORE_VERSION',
                  recordId: id,
                  userId: user.id,
                  actorRole: user.role,
                  source: 'API',
                  oldValue: latestVersion ? JSON.stringify({
                      version: latestVersion.versionNumber,
                      checksum: latestVersion.checksum,
                      fileType: latestVersion.fileType
                  }) : null,
                  newValue: JSON.stringify({
                      restoredFromVersion: targetVersion.versionNumber,
                      restoredChecksum: targetVersion.checksum,
                      restoredFileType: targetVersion.fileType,
                      newVersion: newVersionNum
                  })
              }
           });
      });

      return NextResponse.json({ success: true, version: newVersionNum });

  } catch (error: any) {
      console.error('Restore Error:', error);
      return NextResponse.json({ error: 'Restore failed', details: error.message }, { status: 500 });
  }
}
