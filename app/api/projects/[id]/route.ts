import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendEmail } from "@/lib/email";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
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
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
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
        include: { 
            members: true,
            owner: { select: { email: true, name: true } }
        }
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
    const isContributor = memberRec?.role === 'CONTRIBUTOR';

    if (!isOwner && !isManager && !(isContributor && status === 'SUBMITTED' && proj.status === 'DRAFT')) {
         // Allow Contributors to submit drafts, otherwise Strict
         // If just updating metadata (not status), Contributors might be allowed if we wanted.
         // For now, let's say Contributors can only edit if status is DRAFT.
         if (isContributor && proj.status !== 'DRAFT') {
             return NextResponse.json({ error: 'Forbidden: Contributors can only edit Drafts' }, { status: 403 });
         }
         // If neither, then Forbidden
         if (!isContributor && !isOwner && !isManager) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
         }
    }

    // Status Transition Logic
    if (status && status !== proj.status) {
        // Valid Transitions
        const allowedTransitions: Record<string, string[]> = {
            'DRAFT': ['SUBMITTED', 'ARCHIVED'],
            'SUBMITTED': ['IN_REVIEW', 'DRAFT', 'ARCHIVED'], // Draft = Reject back to draft
            'IN_REVIEW': ['APPROVED', 'on_HOLD', 'DRAFT', 'ARCHIVED'],
            'APPROVED': ['ACTIVE', 'ARCHIVED', 'COMPLETED'],
            'ACTIVE': ['COMPLETED', 'ON_HOLD', 'ARCHIVED'],
            'ON_HOLD': ['ACTIVE', 'ARCHIVED'],
            'COMPLETED': ['ARCHIVED', 'ACTIVE'], // Reactivate?
            'ARCHIVED': ['DRAFT'] // Restore
        };

        const allowed = allowedTransitions[proj.status] || [];
        if (!allowed.includes(status)) {
            return NextResponse.json({ error: `Invalid status transition from ${proj.status} to ${status}` }, { status: 400 });
        }

        // Permission Checks for Status
        // Managers/Owners can do anything.
        // Contributors can ONLY do DRAFT -> SUBMITTED.
        if (isContributor && !isManager && !isOwner) {
            if (proj.status === 'DRAFT' && status === 'SUBMITTED') {
                // OK
            } else {
                 return NextResponse.json({ error: 'Forbidden: Contributors can only Submit projects' }, { status: 403 });
            }
        }
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

    // Audit Log for Status Change
    if (status && status !== proj.status) {
        await prisma.auditLog.create({
            data: {
                action: 'PROJECT_STATUS_CHANGE',
                userId,
                actorRole: (session.user as any).role,
                source: 'WEB',
                projectId: id,
                oldValue: proj.status,
                newValue: status
            }
        });

        // Smart Notification: Email Owner
        if (project.owner?.email) {
            const subject = `Project Status Update: ${project.name}`;
            const html = `
                <h2>Project Status Changed</h2>
                <p>The status of project <strong>${project.name}</strong> has been updated.</p>
                <ul>
                    <li><strong>Old Status:</strong> ${proj.status}</li>
                    <li><strong>New Status:</strong> ${status}</li>
                    <li><strong>Updated By:</strong> ${(session.user as any).name || (session.user as any).email}</li>
                </ul>
                <p><a href="${process.env.NEXTAUTH_URL}/projects/${id}">View Project</a></p>
            `;
            await sendEmail({
                to: project.owner.email,
                subject,
                html
            });
        }
    }

    return NextResponse.json(updated);

  } catch (error: any) {
    console.error('Update Project Error:', error);
    return NextResponse.json({ error: 'Failed to update project', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;
  const id = params.id;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { projectRecords: true } },
        members: true
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    // Only Owner or Admin can delete
    const proj = project as any;
    const isOwner = proj.ownerUserId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent deletion if project has linked records
    if (proj._count.projectRecords > 0) {
      return NextResponse.json({
        error: 'Cannot delete project with linked records. Remove records first.'
      }, { status: 400 });
    }

    await prisma.$transaction([
      // Remove all members first
      prisma.projectMember.deleteMany({ where: { projectId: id } }),
      // Delete project
      prisma.project.delete({ where: { id } }),
      // Audit log
      prisma.auditLog.create({
        data: {
          action: 'PROJECT_DELETED',
          userId,
          actorRole: userRole,
          source: 'API',
          projectId: null, // Can't reference deleted project
          oldValue: JSON.stringify({ name: proj.name, id: proj.id })
        }
      })
    ]);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Delete Project Error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
