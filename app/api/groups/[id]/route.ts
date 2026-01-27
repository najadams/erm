import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const group = await prisma.group.findUnique({
            where: { id },
            include: {
                users: { select: { id: true, name: true, email: true } },
                _count: { select: { users: true } }
            }
        });

        if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        return NextResponse.json(group);
    } catch (error) {
        console.error('GET Group Error:', error);
        return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { id } = await params;
        const { name, type, userIds } = await request.json();

        const group = await prisma.group.update({
            where: { id },
            data: {
                name,
                type,
                users: userIds ? { set: userIds.map((uid: string) => ({ id: uid })) } : undefined
            }
        });

        return NextResponse.json(group);
    } catch (error) {
        console.error('PUT Group Error:', error);
        return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { id } = await params;

        // Prevent deletion of system groups
        const group = await prisma.group.findUnique({ where: { id } });
        if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        if (group.type === 'SYSTEM') {
            return NextResponse.json({ error: 'Cannot delete system groups' }, { status: 400 });
        }

        await prisma.group.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE Group Error:', error);
        return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }
}
