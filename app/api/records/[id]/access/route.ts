import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ROLES } from '@/lib/permissions';
import { invalidateForRecord } from '@/lib/access-cache';
import { invalidatePattern } from '@/lib/cache';

export async function GET(
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

  // 1. Check Authority (Admin or Owner)
  const record = await prisma.record.findUnique({
      where: { id },
      select: { ownerUserId: true, projectId: true, departmentId: true }
  });

  if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  }

  const isOwner = record.ownerUserId === user.id;
  const isAdmin = user.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
      // 2. Fetch Explicit Access
      const explicitAccess = await prisma.recordAccess.findMany({
          where: { recordId: id },
          include: {
              user: { select: { id: true, name: true, email: true } },
              group: { select: { id: true, name: true } }
          }
      });

      // 3. Calculate Inherited Access (Read-Only context)
      // This is purely for display to let the admin know who else can see it.
      const inherited = [];
      
      if (record.projectId) {
          const project = await prisma.group.findUnique({ where: { id: record.projectId }, select: { name: true }});
          if (project) {
              inherited.push({
                  source: `Project: ${project.name}`,
                  level: 'EDIT', // Assuming project members can edit
                  description: 'All members of this project have access.'
              });
          }
      }

      if (record.departmentId) {
          const dept = await prisma.department.findUnique({ where: { id: record.departmentId }, select: { name: true }});
          if (dept) {
              inherited.push({
                  source: `Department: ${dept.name}`,
                  level: 'VIEW',
                  description: 'Members of this department can view.'
              });
          }
      }

      return NextResponse.json({
          explicit: explicitAccess,
          inherited: inherited
      });

  } catch (error) {
      console.error('Fetch Access Error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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

  // Only Admin or Owner can manage access
  const record = await prisma.record.findUnique({
      where: { id },
      select: { title: true, ownerUserId: true }
  });

  if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  }

  const isOwner = record.ownerUserId === user.id;
  const isAdmin = user.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
      const body = await request.json();
      const { principalType, principalId, level, accessType } = body;

      // Validation
      if (!['USER', 'GROUP'].includes(principalType)) {
          return NextResponse.json({ error: 'Invalid principal type' }, { status: 400 });
      }
      if (!principalId) {
          return NextResponse.json({ error: 'Principal ID required' }, { status: 400 });
      }

      // Strong Existence Check
      if (principalType === 'USER') {
          const exists = await prisma.user.findUnique({ where: { id: principalId }});
          if (!exists) return NextResponse.json({ error: 'User does not exist' }, { status: 400 });
      } else {
          const exists = await prisma.group.findUnique({ where: { id: principalId }});
          if (!exists) return NextResponse.json({ error: 'Group does not exist' }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx: any) => {
          // Check if trying to add duplicate
          const existing = await tx.recordAccess.findFirst({
              where: {
                  recordId: id,
                  OR: [
                      { userId: principalType === 'USER' ? principalId : undefined },
                      { groupId: principalType === 'GROUP' ? principalId : undefined }
                  ]
              }
          });

          let accessRecord;

          if (existing) {
              // Update existing
              accessRecord = await tx.recordAccess.update({
                  where: { id: existing.id },
                  data: {
                      level: level || existing.level,
                      accessType: accessType || existing.accessType
                  }
              });
          } else {
              // Create new
              accessRecord = await tx.recordAccess.create({
                  data: {
                      recordId: id,
                      principalType,
                      userId: principalType === 'USER' ? principalId : undefined,
                      groupId: principalType === 'GROUP' ? principalId : undefined,
                      level: level || 'VIEW',
                      accessType: accessType || 'ALLOW'
                  }
              });
          }

          // Audit Log
          await tx.auditLog.create({
              data: {
                  action: existing ? 'MODIFY_ACCESS' : 'GRANT_ACCESS',
                  recordId: id,
                  userId: user.id,
                  actorRole: user.role,
                  source: 'API',
                  newValue: JSON.stringify({
                      principalType,
                      principalId,
                      level,
                      accessType
                  })
              }
          });

          return accessRecord;
      });

      // Invalidate materialized access cache for this record
      await invalidateForRecord(id);
      await invalidatePattern('acs:*');

      return NextResponse.json(result);

  } catch (error: any) {
      console.error('Grant Access Error:', error);
      return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
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
    const { searchParams } = new URL(request.url);
    const accessId = searchParams.get('accessId');

    if (!accessId) {
        return NextResponse.json({ error: 'Access ID required' }, { status: 400 });
    }

    // Only Admin or Owner can manage access
    const record = await prisma.record.findUnique({
        where: { id },
        select: { ownerUserId: true }
    });
  
    if (!record) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
  
    const isOwner = record.ownerUserId === user.id;
    const isAdmin = user.role === ROLES.ADMIN;
  
    if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        await prisma.$transaction(async (tx: any) => {
            const access = await tx.recordAccess.findUnique({ where: { id: accessId }});
            if (!access) throw new Error('Access permission not found');

            await tx.recordAccess.delete({
                where: { id: accessId }
            });

            // Audit
            await tx.auditLog.create({
                data: {
                    action: 'REVOKE_ACCESS',
                    recordId: id,
                    userId: user.id,
                    actorRole: user.role,
                    source: 'API',
                    oldValue: JSON.stringify(access)
                }
            });
        });

        // Invalidate materialized access cache for this record
        await invalidateForRecord(id);
        await invalidatePattern('acs:*');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Revoke Access Error:', error);
        return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 });
    }
}
