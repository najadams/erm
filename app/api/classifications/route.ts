import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Helper to check if user can manage classifications
async function canManageClassifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const userRole = (session.user as any)?.role;
  return hasPermission(userRole, PERMISSIONS.MANAGE_CLASSIFICATIONS) || userRole === 'ADMIN';
}

// Get organization ID from user (simplified - you may need to add organization to User model)
async function getOrganizationId(userId: string): Promise<string> {
  // For now, get first organization or create default
  // In production, you'd link users to organizations
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Default Organization', status: 'ACTIVE' }
    });
  }
  return org.id;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const level = searchParams.get('level');
    const parentId = searchParams.get('parentId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (level) where.level = parseInt(level);
    if (parentId) where.parentId = parentId;
    if (!includeInactive) where.isActive = true;

    // Role-based filtering
    const userRole = (session.user as any)?.role;
    const userDeptId = (session.user as any)?.departmentId;
    
    // If strict ABAC is required as per user request:
    // "Staff see only allowed classifications" -> "classification.departmentId === user.departmentId"
    // We added departmentId to ClassificationNode to support this.
    if ((userRole === 'STAFF' || userRole === 'DEPT_HEAD') && userDeptId) {
       // Filter where departmentId is null (Global) OR matches user's department
       // (Using OR in Prisma for this mixed condition requires specific syntax or multiple queries, 
       // but here we can add a condition if departmentId exists on the model)
       // where.OR = [{ departmentId: null }, { departmentId: userDeptId }];
       // Since we are about to add departmentId to ClassificationNode, I'll allow this code to sit, 
       // but first I must add the column.
       where.OR = [
         { departmentId: null },
         { departmentId: userDeptId }
       ];
    }


    const nodes = await prisma.classificationNode.findMany({
      where,
      include: {
        parent: {
          include: {
            parent: true
          }
        },
        children: true,
        _count: {
          select: {
            records: true,
            children: true,
          }
        },
        templates: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          take: 1
        }
      },
      orderBy: [
        { level: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(nodes);
  } catch (error: any) {
    console.error('Error fetching classifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classifications', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await canManageClassifications()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, level, parentId, code, organizationId, securityLevel } = body;

    // Validation
    if (!name || !level || (level < 1 || level > 3)) {
      return NextResponse.json(
        { error: 'Invalid data: name and level (1-3) are required' },
        { status: 400 }
      );
    }

    // Get organization ID
    const orgId = organizationId || await getOrganizationId(userId);

    // Validate parent if provided
    if (parentId) {
      const parent = await prisma.classificationNode.findUnique({
        where: { id: parentId }
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent node not found' }, { status: 404 });
      }
      if (parent.level !== level - 1) {
        return NextResponse.json(
          { error: `Invalid level: Level ${level} must have a Level ${level - 1} parent` },
          { status: 400 }
        );
      }
      if (parent.organizationId !== orgId) {
        return NextResponse.json({ error: 'Parent must be in same organization' }, { status: 400 });
      }
    } else if (level !== 1) {
      return NextResponse.json(
        { error: 'Level 2 and 3 nodes must have a parent' },
        { status: 400 }
      );
    }

    // Check for cycles (parent cannot be a descendant)
    if (parentId) {
      let currentParentId = parentId;
      const visited = new Set<string>();
      while (currentParentId) {
        if (visited.has(currentParentId)) {
          return NextResponse.json({ error: 'Cycle detected' }, { status: 400 });
        }
        visited.add(currentParentId);
        const parent = await prisma.classificationNode.findUnique({
          where: { id: currentParentId },
          select: { parentId: true }
        });
        currentParentId = parent?.parentId || '';
      }
    }

    // Create node
    const node = await prisma.classificationNode.create({
      data: {
        name,
        level,
        parentId: parentId || null,
        code: code || null,
        securityLevel: securityLevel ? parseInt(securityLevel) : 1,
        isLeaf: level === 3,
        isActive: true,
        organizationId: orgId,
        createdById: userId,
      },
      include: {
        parent: true,
        children: true,
      }
    });

    return NextResponse.json(node, { status: 201 });
  } catch (error: any) {
    console.error('Error creating classification:', error);
    return NextResponse.json(
      { error: 'Failed to create classification', details: error.message },
      { status: 500 }
    );
  }
}
