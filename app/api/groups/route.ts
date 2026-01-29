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

  try {
    const groups = await prisma.group.findMany({
       include: {
         _count: {
            select: { users: true }
         },
         users: {
            select: { id: true, name: true, email: true }
         }
       },
       orderBy: { name: 'asc' }
    });
    return NextResponse.json(groups);
  } catch (error: any) {
    console.error('[API] GET Groups Error:', {
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await canManage(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const body = await request.json();
    const { name, type, userIds } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing name or type' }, { status: 400 });
    }

    // 1. Transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
        // Create the Group
        const group = await tx.group.create({
            data: { 
                name, 
                type,
                users: userIds && userIds.length > 0 ? {
                    connect: userIds.map((id: string) => ({ id }))
                } : undefined
            },
            include: {
                users: true,
                _count: { select: { users: true } }
            }
        });

        // If type is DEPARTMENT, create corresponding Department entity
        if (type === 'DEPARTMENT') {
            // Find or create default Org
            let org = await tx.organization.findFirst();
            if (!org) {
                org = await tx.organization.create({
                    data: {
                        name: 'Ghana Investment Promotion Centre',
                    }
                });
            }

            // Generate Code (e.g. Finance Team -> FINANCE_TEAM or FIN)
            // Let's take first 3 chars or acronym if possible, but keep it unique?
            // Simple approach: Uppercase, Underscore, Random Suffix if needed? 
            // Better: Name to Uppercase Snake Case.
            let code = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 10);
            if (code.length < 2) code = "DEPT_" + Math.floor(Math.random() * 1000);

            // Create Department
            await tx.department.create({
                data: {
                    name: name,
                    code: code,
                    organizationId: org.id,
                    linkedGroupId: group.id
                }
            });
        }

        return group;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST Group Error:', {
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Failed to create group: ' + error.message }, { status: 500 });
  }
}
