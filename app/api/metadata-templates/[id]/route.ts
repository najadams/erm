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
    
    const template = await prisma.metadataTemplate.findUnique({
      where: { id },
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

      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template', details: error.message },
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
    const { name, isActive, fields } = body;

    const existing = await prisma.metadataTemplate.findUnique({
      where: { id },
      include: {

      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }


    // Update template
    const updateData: any = {};
    if (name) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update fields if provided
    if (fields) {
      // Delete existing fields and recreate
      await prisma.templateField.deleteMany({
        where: { templateId: id }
      });

      await prisma.templateField.createMany({
        data: fields.map((field: any, index: number) => ({
          templateId: id,
          metadataFieldId: field.metadataFieldId,
          required: field.required || false,
          displayOrder: field.displayOrder !== undefined ? field.displayOrder : index,
          editable: field.editable !== undefined ? field.editable : true,
        }))
      });
    }

    const updated = await prisma.metadataTemplate.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template', details: error.message },
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

    const template = await prisma.metadataTemplate.findUnique({
      where: { id },
      include: {

      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Prevent deletion if it has records
    if (template._count.records > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template with existing records' },
        { status: 400 }
      );
    }

    await prisma.metadataTemplate.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template', details: error.message },
      { status: 500 }
    );
  }
}
