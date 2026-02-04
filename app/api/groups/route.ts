import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  try {
    const groups = await prisma.group.findMany({
      where: q ? {
        name: { contains: q, mode: 'insensitive' }
      } : {},
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { users: true }
        }
      },
      take: 20
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Search Groups Error:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Only Admin can create groups
  if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, type, userIds, code } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Prepare users connection
    const usersToConnect = userIds && Array.isArray(userIds) 
      ? userIds.map((id: string) => ({ id }))
      : [];

    let createdGroup;

    if (type === 'DEPARTMENT') {
        // 1. Get Default Organization
        const org = await prisma.organization.findFirst();
        if (!org) {
            return NextResponse.json({ error: 'System Error: No Organization found to attach Department to' }, { status: 500 });
        }

        // 2. Generate or Validate Code
        let deptCode = code;
        if (!deptCode) {
            // Auto-generate: First 3 chars of name, uppercased
            deptCode = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
            if (deptCode.length < 2) deptCode = 'DEP'; // Fallback
            
            // Ensure uniqueness (simple append check) changes logic slightly, 
            // but for now let's rely on user or simple generation
        }

        // Check if Department Code exists
        const existingDept = await prisma.department.findFirst({ 
            where: { 
                code: deptCode, 
                organizationId: org.id 
            } 
        });

        if (existingDept) {
            // Append random suffix if collision on auto-gen? 
            // Or just fail? Let's fail if manual, auto-fix if auto?
            // User requested mutable field, so they provided it. 
            // If they didn't provide it, we generated it. 
            if (code) return NextResponse.json({ error: `Department code '${deptCode}' already exists` }, { status: 409 });
            deptCode = `${deptCode}${Math.floor(Math.random() * 100)}`;
        }

        // 3. Create Group AND Department transactionally
         createdGroup = await prisma.$transaction(async (tx) => {
             // A. Create Group
             const grp = await tx.group.create({
                 data: {
                     name,
                     type: 'DEPARTMENT',
                     users: { connect: usersToConnect }
                 }
             });

             // B. Create Department
             await tx.department.create({
                 data: {
                     name,
                     code: deptCode,
                     organizationId: org.id,
                     linkedGroupId: grp.id
                 }
             });
             
             return grp;
         });

    } else {
        // Just create Group
        createdGroup = await prisma.group.create({
            data: {
                name,
                type,
                users: { connect: usersToConnect }
            }
        });
    }

    return NextResponse.json(createdGroup, { status: 201 });

  } catch (error) {
    console.error('Create Group Error:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
