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
    const { name, code, isActive, securityLevel, parentId } = body;

    // Check if node exists
    const existing = await prisma.classificationNode.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            records: true,
            children: true,
          }
        },
        children: {
            select: { id: true }
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

    // Handle Reparenting Logic
    let newLevel = existing.level;
    if (parentId !== undefined && parentId !== existing.parentId) {
        // 1. Validation: Circular Dependency
        if (parentId === id) {
            return NextResponse.json({ error: 'Cannot set parent to self' }, { status: 400 });
        }
        
        // Check if parentId is currently a child (shallow check for MVP, or recursive in real app)
        // For now, let's just do a basic check provided logic doesn't allow dragging parent into child in UI easily 
        // without careful traversal, but backend should verify.
        // A robust check requires traversing up from newParent to check if 'id' is an ancestor.
        
        if (parentId) {
            const newParent = await prisma.classificationNode.findUnique({ where: { id: parentId } });
            if (!newParent) {
                 return NextResponse.json({ error: 'Target parent not found' }, { status: 404 });
            }
            newLevel = newParent.level + 1;
            
            // Circular check: is 'id' an ancestor of 'newParent'?
            let current = newParent;
            let loopGuard = 0;
            while (current.parentId && loopGuard < 10) {
                if (current.parentId === id) {
                    return NextResponse.json({ error: 'Circular dependency detected' }, { status: 400 });
                }
                // Move up
                if (current.parentId) {
                    const ancestor = await prisma.classificationNode.findUnique({ where: { id: current.parentId }});
                    if (!ancestor) break;
                    current = ancestor;
                }
                loopGuard++;
            }
        } else {
            // Moving to root
            newLevel = 1;
        }

        // Limit depth
        if (newLevel > 3) {
             return NextResponse.json({ error: 'Max depth (3) exceeded' }, { status: 400 });
        }
    }

    // Prevent Level 3 (Leaf) mismatch if it has records?
    // If moving L3 -> L2, it becomes L2. If it had records, is that okay?
    // Schema: Record has classificationNodeId. 
    // Ideally only L3 should have records. If we demote L3 to L2 (by making it child of L1), 
    // it technically shouldn't have records if strict.
    // BUT, for flexibility, let's allow it, but warn?
    // For now, proceed.

    const updated = await prisma.classificationNode.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code !== undefined && { code }),
        ...(isActive !== undefined && { isActive }),
        ...(securityLevel !== undefined && { securityLevel: parseInt(securityLevel) }),
        ...(parentId !== undefined && { parentId }), // This can be null (moving to root)
        level: newLevel
      },
      include: {
        parent: true,
        children: true,
      }
    });
    
    // Recursive Level Update for children (Basic 1-level down propagation for MVP)
    if (newLevel !== existing.level) {
        // If I moved from L2 to L1, my children (L3) need to become L2.
        // If I move from L1 to L2, my children need to become L3.
        const diff = newLevel - existing.level;
        
        // This is tricky without a recursive function or raw query.
        // Let's do a simple update for direct children.
        // Deep trees might need a background job or recursive function.
        // Given max depth 3, it's shallow.
        
        const children = await prisma.classificationNode.findMany({ where: { parentId: id }});
        for (const child of children) {
            const childNewLevel = child.level + diff;
            if (childNewLevel <= 3) {
                 await prisma.classificationNode.update({
                     where: { id: child.id },
                     data: { level: childNewLevel }
                 });
                 
                 // If that child had children, update them too... (Max L3 so this is the end usually)
                 if (childNewLevel < 3) {
                     // Update grand-children
                      const grandChildren = await prisma.classificationNode.findMany({ where: { parentId: child.id }});
                      for (const gc of grandChildren) {
                          if (gc.level + diff <= 3) {
                              await prisma.classificationNode.update({
                                  where: { id: gc.id },
                                  data: { level: gc.level + diff }
                              });
                          }
                      }
                 }
            }
        }
    }

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
