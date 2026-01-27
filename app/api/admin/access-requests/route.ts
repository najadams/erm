import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

async function isAdminOrManager() {
  const session = await getServerSession(authOptions);
  // Basic check - in production you might want finer grained "Records Manager" role
  const role = (session?.user as any)?.role;
  return role === 'ADMIN' || role === 'RECORDS_MANAGER' || role === 'MANAGER';
}

export async function GET(request: NextRequest) {
    if (!await isAdminOrManager()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const requests = await prisma.recordAccessRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                requester: {
                    select: { id: true, name: true, email: true, department: true }
                },
                record: {
                    select: { id: true, title: true, referenceNumber: true } // Removed securityLevel from select if not in Record model, but accessing it usually implies relations. Let's check prisma. 
                    // Record model doesn't have securityLevel directly, it might be on classification. 
                    // Let's stick to basic fields first.
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(requests);
    } catch (error) {
        console.error('List Access Requests Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
