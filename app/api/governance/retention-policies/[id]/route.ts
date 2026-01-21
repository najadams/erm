
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userRole = (session.user as any).role;
    if (userRole !== ROLES.ADMIN && userRole !== ROLES.RECORDS_OFFICER) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = await params;
        
        // 1. Break relation with RecordTypes
        await prisma.recordType.updateMany({
            where: { retentionPolicyId: id },
            data: { retentionPolicyId: null }
        });

        // 2. Break relation with Records (or we could forbid delete if records exist)
        // For now, we allow delete and just unlink the policy.
        await prisma.record.updateMany({
            where: { retentionPolicyId: id },
            data: { retentionPolicyId: null }
        });

        const policy = await prisma.retentionPolicy.delete({
            where: { id }
        });

        await prisma.auditLog.create({
            data: {
                action: 'RETENTION_POLICY_DELETED',
                userId: (session.user as any).id,
                actorRole: userRole,
                source: 'API',
                oldValue: JSON.stringify(policy)
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE Retention Policy Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userRole = (session.user as any).role;
    if (userRole !== ROLES.ADMIN && userRole !== ROLES.RECORDS_OFFICER) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const { 
            name, description, durationValue, durationUnit,
            trigger, dispositionAction, preventDeletion, 
            status, recordTypeIds 
        } = body;
        
        // Fetch old for audit
        const oldPolicy = await prisma.retentionPolicy.findUnique({ where: { id }, include: { recordTypes: true } });

        let finalDurationValue: number | null = durationValue ? parseInt(durationValue) : null;
        if (durationUnit === 'PERMANENT') {
            finalDurationValue = null;
        }

        const policy = await prisma.retentionPolicy.update({
            where: { id },
            data: {
                name,
                description,
                durationValue: finalDurationValue,
                durationUnit,
                trigger,
                dispositionAction,
                preventDeletion,
                status,
                recordTypes: recordTypeIds ? {
                    set: recordTypeIds.map((tid: string) => ({ id: tid }))
                } : undefined
            },
            include: { recordTypes: true }
        });

        await prisma.auditLog.create({
            data: {
                action: 'RETENTION_POLICY_UPDATED',
                userId: (session.user as any).id,
                actorRole: userRole,
                source: 'API',
                oldValue: JSON.stringify(oldPolicy),
                newValue: JSON.stringify(policy)
            }
        });

        return NextResponse.json(policy);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
