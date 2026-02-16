import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const where: any = { requesterId: userId };
    if (status) where.status = status;

    try {
        const requests = await prisma.accessRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                record: {
                    select: { id: true, title: true, referenceNumber: true, securityClassification: true }
                },
                registeredCompany: {
                    select: { id: true, name: true, registrationNumber: true }
                },
                reviewedBy: {
                    select: { name: true }
                }
            }
        });

        return NextResponse.json(requests);
    } catch (error) {
        console.error('My Access Requests Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/my-requests?id=<requestId>
 * Cancel a pending access request (only the requester can cancel their own)
 */
export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const requestId = request.nextUrl.searchParams.get('id');

    if (!requestId) {
        return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    try {
        const accessRequest = await prisma.accessRequest.findUnique({
            where: { id: requestId }
        });

        if (!accessRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (accessRequest.requesterId !== userId) {
            return NextResponse.json({ error: 'You can only cancel your own requests' }, { status: 403 });
        }

        if (accessRequest.status !== 'PENDING') {
            return NextResponse.json({ error: 'Only pending requests can be cancelled' }, { status: 400 });
        }

        await prisma.$transaction([
            prisma.accessRequest.delete({ where: { id: requestId } }),
            prisma.auditLog.create({
                data: {
                    action: 'ACCESS_REQUEST_CANCELLED',
                    recordId: accessRequest.recordId,
                    userId,
                    actorRole: (session.user as any).role,
                    source: 'API',
                    newValue: JSON.stringify({
                        requestedLevel: accessRequest.requestedLevel,
                        resourceType: accessRequest.resourceType
                    })
                }
            })
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Cancel Access Request Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
