import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

// Helper to check permissions
async function getManagerPerms(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true }
    });

    if (!project) return null;

    const isOwner = project.ownerUserId === userId;
    const member = project.members.find(m => m.userId === userId);
    
    return {
        isOwner,
        canManage: isOwner || member?.role === 'MANAGER',
        project
    };
}

// GET: List members
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Basic access check (must be member or have visibility) handled by visibility logic
    // For simplicity, we'll replicate the basic check or just fetch if authorized.
    // Reusing the logic from projects/[id] or just strict member check?
    // Let's allow members to see members.
    
    // ... Implement logic if needed, but the main project API returns members. 
    // This endpoint is useful for simple fetching or refresh.
    
    // For now, let's implement just the mutations as GET is covered.
    return NextResponse.json({ error: 'Use project details endpoint for listing' }, { status: 501 });
}

// POST: Add Member
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); // ID: 1
    }

    const projectId = params.id;
    const userId = (session.user as any).id;

    const perms = await getManagerPerms(projectId, userId);
    if (!perms) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (!perms.canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const body = await request.json();
        const { email, role } = body;

        if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

        // Find user by email
        const userToAdd = await prisma.user.findUnique({ where: { email } });
        if (!userToAdd) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if already member
        const existing = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId: userToAdd.id
                }
            }
        });

        if (existing) {
             return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
        }
        
        // Prevent adding Owner as member (they are already implicit, but maybe we want explicit?)
        // Schema says specific relation for Owner. Member is separate.
        if (userToAdd.id === perms.project.ownerUserId) {
             return NextResponse.json({ error: 'User is the project owner' }, { status: 400 });
        }

        const newMember = await prisma.projectMember.create({
            data: {
                projectId,
                userId: userToAdd.id,
                role: role || 'CONTRIBUTOR'
            },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        });

        return NextResponse.json(newMember);

    } catch (error: any) {
        console.error('Add Member Error:', error);
        return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }
}

// PATCH: Update Member Role
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const userId = (session.user as any).id;

    const perms = await getManagerPerms(projectId, userId);
    if (!perms) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (!perms.canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const body = await request.json();
        const { memberId, role } = body; // memberId is ProjectMember ID (UUID)

        if (!memberId || !role) return NextResponse.json({ error: 'Member ID and Role required' }, { status: 400 });

        const member = await prisma.projectMember.findUnique({ where: { id: memberId } });
        if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

        // Prevent modifying someone else if you are not owner? 
        // Managers can modify other members, but maybe not other Managers?
        // Let's keep it simple: Managers can do anything except touch owner (who isn't a member record usually).
        
        await prisma.projectMember.update({
            where: { id: memberId },
            data: { role }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Update Member Error:', error);
        return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }
}

// DELETE: Remove Member
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId'); // ProjectMember ID

    const perms = await getManagerPerms(projectId, userId);
    if (!perms) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (!perms.canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (!memberId) {
        // Maybe try removing by userId/email?
        // For now expect ID
        return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    try {
        await prisma.projectMember.delete({
            where: { id: memberId }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
         console.error('Remove Member Error:', error);
         return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
}
