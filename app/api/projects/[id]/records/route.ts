import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

// GET: List all records linked to a project
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    try {
        const projectRecords = await prisma.projectRecord.findMany({
            where: { projectId },
            include: {
                record: {
                    include: {
                        classificationNode: true,
                        recordType: true,
                        versions: {
                             take: 1,
                             orderBy: { createdAt: 'desc' },
                             select: { fileType: true }
                        }
                    }
                },
                addedBy: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { addedAt: 'desc' }
        });

        // Flatten the structure for the frontend if needed, or send as is
        // Sending as is allows showing "Added by X on Y"
        return NextResponse.json(projectRecords);

    } catch (error: any) {
        console.error('Fetch Project Records Error:', error);
        return NextResponse.json({ error: 'Failed to fetch project records' }, { status: 500 });
    }
}

// Helper to check permissions
async function getProjectPermission(projectId: string, userId: string, userRole?: string) {
    if (userRole === 'ADMIN') {
        return {
            isOwner: false,
            member: null,
            canEdit: true,
            canContribute: true,
            isMember: true 
        };
    }

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true }
    });

    if (!project) return null;

    const isOwner = project.ownerUserId === userId;
    const member = project.members.find(m => m.userId === userId);
    
    return {
        isOwner,
        member,
        canEdit: isOwner || member?.role === 'MANAGER',
        canContribute: isOwner || member?.role === 'MANAGER' || member?.role === 'CONTRIBUTOR',
        isMember: isOwner || !!member
    };
}

// POST: Link a record to a project
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // RBAC Check
    const perms = await getProjectPermission(projectId, userId, userRole);
    if (!perms) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (!perms.canContribute) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const body = await request.json();
        const { recordId } = body;

        if (!recordId) {
            return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
        }

        // Check if already linked
        const existing = await prisma.projectRecord.findUnique({
            where: {
                projectId_recordId: {
                    projectId,
                    recordId
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'Record is already linked to this project' }, { status: 409 });
        }

        // Verify record exists
        const record = await prisma.record.findUnique({ where: { id: recordId } });
        if (!record) {
             return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        const projectRecord = await prisma.projectRecord.create({
            data: {
                projectId,
                recordId,
                addedById: userId
            },
            include: {
                record: true,
                addedBy: { select: { name: true } }
            }
        });

        return NextResponse.json(projectRecord);

    } catch (error: any) {
        console.error('Link Project Record Error:', error);
        return NextResponse.json({ error: 'Failed to link record to project' }, { status: 500 });
    }
}

// DELETE: Unlink a record from a project
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
        return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    // RBAC Check
    const perms = await getProjectPermission(projectId, userId, userRole);
    if (!perms) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    
    // Deletion requires Manager permissions (or if user added it? Keeping it strict for now)
    if (!perms.canEdit) {
         return NextResponse.json({ error: 'Forbidden: Only Managers can unlink records' }, { status: 403 });
    }

    try {
        await prisma.projectRecord.delete({
            where: {
                projectId_recordId: {
                    projectId,
                    recordId
                }
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        if (error.code === 'P2025') {
             return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }
        console.error('Unlink Project Record Error:', error);
        return NextResponse.json({ error: 'Failed to unlink record' }, { status: 500 });
    }
}
