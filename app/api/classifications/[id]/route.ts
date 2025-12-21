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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const node = await prisma.classificationNode.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            _count: {
              select: {
                records: true,
                children: true,
              }
            }
          }
        },
        templates: {
          where: { isActive: true },
          include: {
            templateFields: {
              include: {
                metadataField: true
              },
              orderBy: { displayOrder: 'asc' }
            }
          },
          orderBy: { version: 'desc' },
          take: 1 // Get latest active template
        },
        _count: {
          select: {
            records: true,
            children: true,
          }
        }
      }
    });

    if (!node) {
      return NextResponse.json({ error: 'Classification not found' }, { status: 404 });
    }

    return NextResponse.json(node);
  } catch (error: any) {
    console.error('Error fetching classification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classification', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await canManageClassifications()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, code, isActive } = body;

    // Check if node exists
    const existing = await prisma.classificationNode.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            records: true,
            children: true,
          }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Classification not found' }, { status: 404 });
    }

    // Prevent deactivating if it has records (unless force flag)
    if (isActive === false && existing._count.records > 0 && !body.force) {
      return NextResponse.json(
        { error: 'Cannot deactivate classification with existing records' },
        { status: 400 }
      );
    }

    const updated = await prisma.classificationNode.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code !== undefined && { code }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        parent: true,
        children: true,
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating classification:', error);
    return NextResponse.json(
      { error: 'Failed to update classification', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await canManageClassifications()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if node exists and has dependencies
    const node = await prisma.classificationNode.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            records: true,
            children: true,
          }
        }
      }
    });

    if (!node) {
      return NextResponse.json({ error: 'Classification not found' }, { status: 404 });
    }

    // Prevent deletion if it has records or children
    if (node._count.records > 0) {
      return NextResponse.json(
        { error: 'Cannot delete classification with existing records' },
        { status: 400 }
      );
    }

    if (node._count.children > 0) {
      return NextResponse.json(
        { error: 'Cannot delete classification with child nodes' },
        { status: 400 }
      );
    }

    await prisma.classificationNode.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Classification deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting classification:', error);
    return NextResponse.json(
      { error: 'Failed to delete classification', details: error.message },
      { status: 500 }
    );
  }
}


