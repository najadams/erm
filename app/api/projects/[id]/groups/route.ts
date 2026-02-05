import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for adding a group
const AddGroupSchema = z.object({
  groupId: z.string().uuid(),
  role: z.enum(['MANAGER', 'CONTRIBUTOR', 'VIEW_ONLY']),
});

// Schema for updating a group role
const UpdateGroupSchema = z.object({
  groupId: z.string().uuid(),
  role: z.enum(['MANAGER', 'CONTRIBUTOR', 'VIEW_ONLY']),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    
    const validated = AddGroupSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { groupId, role } = validated.data;

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if group is already added
    const existing = await prisma.projectGroup.findUnique({
      where: {
        projectId_groupId: {
          projectId,
          groupId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Group is already a member of this project' },
        { status: 409 }
      );
    }

    // Add group
    const projectGroup = await prisma.projectGroup.create({
      data: {
        projectId,
        groupId,
        role,
      },
      include: {
        group: true,
      },
    });

    return NextResponse.json(projectGroup);
  } catch (error) {
    console.error('Error adding group to project:', error);
    return NextResponse.json(
      { error: 'Failed to add group to project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const projectId = params.id;
        const body = await request.json();

        const validated = UpdateGroupSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: validated.error.flatten() },
                { status: 400 }
            );
        }

        const { groupId, role } = validated.data;

        // Update
        const updated = await prisma.projectGroup.update({
            where: {
                projectId_groupId: {
                    projectId,
                    groupId
                }
            },
            data: { role },
            include: { group: true }
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error('Error updating group role:', error);
        return NextResponse.json(
             { error: 'Failed to update group role' },
             { status: 500 }
        );
    }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    await prisma.projectGroup.delete({
      where: {
        projectId_groupId: {
          projectId,
          groupId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing group from project:', error);
    if ((error as any).code === 'P2025') {
        return NextResponse.json({ error: 'Group not found in project' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to remove group from project' },
      { status: 500 }
    );
  }
}
