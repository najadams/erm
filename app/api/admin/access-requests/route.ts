import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

async function isAdminOrManager() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  return role === 'ADMIN' || role === 'RECORDS_OFFICER' || role === 'APPROVER' || role === 'RECORDS_MANAGER' || role === 'MANAGER';
}

export async function GET(request: NextRequest) {
    if (!await isAdminOrManager()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED, or null for all
    const sortBy = searchParams.get('sortBy') || 'oldest'; // oldest (urgency) or newest
    const resourceType = searchParams.get('resourceType'); // RECORD or COMPANY
    const groupBy = searchParams.get('groupBy'); // 'batch' to group by batchId
    const batchId = searchParams.get('batchId'); // Filter by specific batch

    const where: any = {};
    if (status) where.status = status;
    if (resourceType) where.resourceType = resourceType;
    if (batchId) where.batchId = batchId;

    try {
        const requests = await prisma.accessRequest.findMany({
            where,
            include: {
                requester: {
                    select: { id: true, name: true, email: true, department: { select: { name: true, code: true } } }
                },
                record: {
                    select: { id: true, title: true, referenceNumber: true, securityClassification: true }
                },
                registeredCompany: {
                    select: { id: true, name: true, registrationNumber: true }
                },
                reviewedBy: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: sortBy === 'newest' ? 'desc' : 'asc' }
        });

        // If groupBy=batch, group the results
        if (groupBy === 'batch') {
            const batches: Record<string, any> = {};
            const individual: any[] = [];

            for (const req of requests) {
                if (req.batchId) {
                    if (!batches[req.batchId]) {
                        batches[req.batchId] = {
                            batchId: req.batchId,
                            createdAt: req.createdAt,
                            requester: req.requester,
                            reason: req.reason,
                            requestedLevel: req.requestedLevel,
                            requests: [],
                            stats: { pending: 0, approved: 0, rejected: 0 }
                        };
                    }
                    batches[req.batchId].requests.push(req);
                    if (req.status === 'PENDING') batches[req.batchId].stats.pending++;
                    else if (req.status === 'APPROVED') batches[req.batchId].stats.approved++;
                    else if (req.status === 'REJECTED') batches[req.batchId].stats.rejected++;
                } else {
                    individual.push(req);
                }
            }

            // Sort batches by oldest request
            const sortedBatches = Object.values(batches).sort((a: any, b: any) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
            });

            return NextResponse.json({
                batches: sortedBatches,
                individual
            });
        }

        return NextResponse.json(requests);
    } catch (error) {
        console.error('List Access Requests Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
