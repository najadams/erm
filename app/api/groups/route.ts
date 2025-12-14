import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

async function canManage(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  // Use our permission helper
  return hasPermission(userRole, PERMISSIONS.MANAGE_USERS);
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Allow all authenticated users to view groups for filtering


  try {
    const groups = await prisma.group.findMany({
       include: {
         _count: {
            select: { users: true }
         }
       },
       orderBy: { name: 'asc' }
    });
    return NextResponse.json(groups);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await canManage(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const body = await request.json();
    const { name, type } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing name or type' }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: { name, type }
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
