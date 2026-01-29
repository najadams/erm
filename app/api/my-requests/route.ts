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
                    select: { id: true, title: true, referenceNumber: true, classification: true }
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
