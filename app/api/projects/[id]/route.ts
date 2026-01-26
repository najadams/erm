import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  // Properly await params in Next.js 15+ (App Router usually passes params as prop, but if used in route handler, they are available.
  // Note: in Next.js 13+, params is just an object.
  const id = params.id;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true, email: true } },
        registeredCompany: true,
        members: {
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        },
        _count: {
            select: { projectRecords: true }
        }
      } as any
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Access Check: 
    // Must be Owner, Member, or Project is ORG/RESTRICTED
    // If Visibility IS PRIVATE, user MUST be owner or member.
    const proj = project as any;
    const isOwner = proj.ownerUserId === userId;
    const isMember = proj.members.some((m: any) => m.user.id === userId);
    
    if (proj.visibility === 'PRIVATE' && !isOwner && !isMember) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // ORG visibility might still restrict some details, but simplistic for now.

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Project Details Error:', error);
    return NextResponse.json({ error: 'Failed to fetch project', details: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const id = params.id;

  try {
    const body = await request.json();
    // Fields to update
    const { 
        name, 
        description, 
        status, 
        visibility,
        type,
        priority,
        sector,
        startDate,
        endDate
    } = body;

    // Fetch existing validation
    const project = await prisma.project.findUnique({
        where: { id },
        include: { members: true }
    });

    if (!project) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    // Access Control: Only Owner or MANAGER role can edit
    // Simplify: Only Owner for now, or Member with role MANAGER
    const proj = project as any;
    const isOwner = proj.ownerUserId === userId;
    const memberRec = proj.members.find((m: any) => m.userId === userId);
    const isManager = memberRec?.role === 'MANAGER';

    if (!isOwner && !isManager) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.project.update({
        where: { id },
        data: {
            name,
            description,
            status,
            visibility,
            type,
            priority,
            sector,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        } as any
    });

    return NextResponse.json(updated);

  } catch (error: any) {
    console.error('Update Project Error:', error);
    return NextResponse.json({ error: 'Failed to update project', details: error.message }, { status: 500 });
  }
}
