import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const visibility = searchParams.get('visibility');

  const where: any = {};

  if (status) {
      where.status = status;
  }

  // Visibility Filter:
  // Projects I own OR Projects I am a member of OR Visible ORG projects
  // Actually, filtering logic might be complex. 
  // For now: Show all public/org projects AND my private projects (membership).
  
  where.OR = [
      { visibility: { in: ['ORG', 'RESTRICTED'] } }, // Simplify: If listed, you can see it exists. Access check is usually deeper.
      { ownerUserId: userId },
      { members: { some: { userId: userId } } }
  ];

  try {
    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { name: true, email: true } },
        _count: {
            select: { members: true, projectRecords: true }
        }
      }
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('Projects API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const { name, description, status, visibility, startDate, endDate } = body;

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        status: status || 'DRAFT',
        visibility: visibility || 'PRIVATE',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        ownerUserId: userId,
        // Add creator as MANAGER automatically
        members: {
            create: {
                userId: userId,
                role: 'MANAGER'
            }
        }
      }
    });

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Create Project Error:', error);
    return NextResponse.json({ error: 'Failed to create project', details: error.message }, { status: 500 });
  }
}
