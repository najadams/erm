import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

async function canManageClassifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const userRole = (session.user as any)?.role;
  return hasPermission(userRole, PERMISSIONS.MANAGE_CLASSIFICATIONS) || userRole === 'ADMIN';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classificationNodeId = searchParams.get('classificationNodeId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = {};
    if (classificationNodeId) where.classificationNodeId = classificationNodeId;
    if (!includeInactive) where.isActive = true;

    const templates = await prisma.metadataTemplate.findMany({
      where,
      include: {
        classificationNode: {
          include: {
            parent: {
              include: {
                parent: true
              }
            }
          }
        },
        templateFields: {
          include: {
            metadataField: true
          },
          orderBy: { displayOrder: 'asc' }
        },
      },
      orderBy: [
        { classificationNodeId: 'asc' },
        { version: 'desc' }
      ]
    });

    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('Error fetching metadata templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata templates', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await canManageClassifications()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { classificationNodeId, name, fields } = body;

    if (!classificationNodeId || !name) {
      return NextResponse.json(
        { error: 'classificationNodeId and name are required' },
        { status: 400 }
      );
    }

    // Verify classification node exists and is Level 3
    const node = await prisma.classificationNode.findUnique({
      where: { id: classificationNodeId }
    });

    if (!node) {
      return NextResponse.json(
        { error: 'Classification node not found' },
        { status: 404 }
      );
    }

    if (node.level !== 3 || !node.isLeaf) {
      return NextResponse.json(
        { error: 'Templates can only be attached to Level 3 (leaf) classification nodes' },
        { status: 400 }
      );
    }

    // Get latest version for this node
    const latestTemplate = await prisma.metadataTemplate.findFirst({
      where: { classificationNodeId },
      orderBy: { version: 'desc' }
    });

    const nextVersion = latestTemplate ? latestTemplate.version + 1 : 1;

    // Create template with fields
    const template = await prisma.metadataTemplate.create({
      data: {
        classificationNodeId,
        name,
        version: nextVersion,
        isActive: true,
        templateFields: {
          create: (fields || []).map((field: any, index: number) => ({
            metadataFieldId: field.metadataFieldId,
            required: field.required || false,
            displayOrder: field.displayOrder !== undefined ? field.displayOrder : index,
            editable: field.editable !== undefined ? field.editable : true,
          }))
        }
      },
      include: {
        classificationNode: true,
        templateFields: {
          include: {
            metadataField: true
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error('Error creating metadata template:', error);
    return NextResponse.json(
      { error: 'Failed to create metadata template', details: error.message },
      { status: 500 }
    );
  }
}
