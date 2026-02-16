import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasPermission } from '@/lib/permissions';

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
  const userId = user.id;
  const userRole = user.role;

  try {
      // 1. Fetch Record (Including deleted ones)
      const record = await prisma.record.findUnique({
          where: { id },
          select: { id: true, title: true, deletedAt: true, status: true }
      });

      if (!record) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      if (!record.deletedAt) {
          return NextResponse.json({ error: 'Record is not deleted' }, { status: 400 });
      }

      // 2. Permission Check
      // Only Admin or Records Officer can restore
      const isAdmin = hasPermission(userRole, 'MANAGE_USERS');
      if (!isAdmin && userRole !== 'RECORDS_OFFICER') {
           return NextResponse.json({ 
               error: `Only Administrators or Records Officers can restore deleted records.` 
           }, { status: 403 });
      }

      // 3. Perform Restore
      await prisma.$transaction(async (tx) => {
           await tx.auditLog.create({
               data: {
                   action: 'RESTORE',
                   userId: userId,
                   actorRole: userRole,
                   source: 'API',
                   newValue: JSON.stringify({ title: record.title, restoredAt: new Date() })
               }
           });
           
           await tx.record.update({ 
               where: { id },
               data: { deletedAt: null }
           });
      });

      return NextResponse.json({ success: true });

  } catch (error: any) {
      console.error('Restore Error:', error);
      return NextResponse.json({ error: 'Restore failed', details: error.message }, { status: 500 });
  }
}
