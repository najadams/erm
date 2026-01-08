
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const hold = await prisma.legalHold.findUnique({
            where: { id },
            include: {
                records: {
                    include: {
                        record: true
                    }
                },
                owner: { select: { name: true, email: true } }
            }
        });
        
        if (!hold) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        return NextResponse.json(hold);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Auth check similar to POST
    const userRole = (session.user as any).role;
    if (userRole !== ROLES.ADMIN && userRole !== ROLES.RECORDS_OFFICER) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        
        const oldHold = await prisma.legalHold.findUnique({ where: { id } });

        const hold = await prisma.legalHold.update({
            where: { id },
            data: {
                name: body.name,
                caseReference: body.caseReference,
                description: body.description,
                ownerId: body.ownerId,
                startDate: body.startDate ? new Date(body.startDate) : undefined,
                endDate: body.endDate ? new Date(body.endDate) : undefined,
                status: body.status, // ACTIVE, RELEASED, CLOSED
                notificationRecipients: body.notificationRecipients,
                notes: body.notes
            }
        });
        
        // If status changed to RELEASED or CLOSED, log it specifically?
        // Audit generic update
        await prisma.auditLog.create({
            data: {
                action: 'LEGAL_HOLD_UPDATED',
                userId: (session.user as any).id,
                actorRole: userRole,
                source: 'API',
                oldValue: JSON.stringify(oldHold),
                newValue: JSON.stringify(hold)
            }
        });

        return NextResponse.json(hold);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userRole = (session.user as any).role;
    if (userRole !== ROLES.ADMIN) {
         return NextResponse.json({ error: 'Forbidden. Only Admins can delete holds.' }, { status: 403 });
    }

    try {
        const { id } = await params;
        
        // Soft delete? User objective said "Cannot be deleted records... Deleting a hold should archive/close it, not delete audit record."
        // But for "Deleting a hold", usually means removing the object.
        // User spec: "Deleting a hold should archive/close it".
        // So DELETE method should actually just set status to CLOSED?
        // Or we strictly enforce soft delete.
        // Let's implement SOFT DELETE (Set status CLOSED) or HARD DELETE if user really wants to remove it (e.g. created in error).
        // User said: "Safeguards: Deleting a hold should archive/close it". 
        // So I will implement DELETE as setting status = CLOSED.
        
        const hold = await prisma.legalHold.update({
            where: { id },
            data: { status: 'CLOSED' } 
        });

        await prisma.auditLog.create({
            data: {
                action: 'LEGAL_HOLD_CLOSED',
                userId: (session.user as any).id,
                actorRole: userRole,
                source: 'API',
                newValue: JSON.stringify(hold)
            }
        });

        return NextResponse.json({ success: true, message: 'Hold closed/archived' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
