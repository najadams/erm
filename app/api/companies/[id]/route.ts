import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

async function checkPermission(session: any) {
    if (!session || !session.user) return false;
    const role = (session.user as any).role;
    // Allow Admin, Records Officer (valid role from lib/permissions.ts), and Auditor
    return ['ADMIN', 'RECORDS_OFFICER', 'AUDITOR'].includes(role);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const company = await prisma.registeredCompany.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { records: true }
                }
            }
        });

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        return NextResponse.json(company);
    } catch (error: any) {
        console.error('Get Company Error:', error);
        return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!await checkPermission(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const { 
            name, 
            registrationNumber, 
            investorType, 
            sector,
            subSectors,
            strategicTags, 
            tin, 
            contactDetails 
        } = body;

        // Check if exists
        const existing = await prisma.registeredCompany.findUnique({ where: { id } });
        if (!existing) {
             return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        // Check unique Reg Number if changing
        if (registrationNumber && registrationNumber !== existing.registrationNumber) {
            const duplicate = await prisma.registeredCompany.findUnique({
                where: { registrationNumber }
            });
            if (duplicate) {
                return NextResponse.json({ error: 'Registration Number already in use' }, { status: 409 });
            }
        }

        const updated = await prisma.registeredCompany.update({
            where: { id },
            data: {
                name,
                registrationNumber,
                investorType,
                sector,
                subSectors,
                strategicTags,
                tin,
                contactDetails: contactDetails ? JSON.stringify(contactDetails) : undefined
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Update Company Error:', error);
        return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    // Strict Delete: Admin Only? Or same as edit? Let's say Admin only for safety.
    const role = (session?.user as any)?.role;
    if (role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = await params;

        // Check for linked records
        const company = await prisma.registeredCompany.findUnique({
            where: { id },
            include: {
                _count: { select: { records: true } }
            }
        });

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        if (company._count.records > 0) {
            return NextResponse.json({ 
                error: 'Cannot delete company with linked records. Please reassign or delete records first.' 
            }, { status: 400 });
        }

        await prisma.registeredCompany.delete({ where: { id } });

        return NextResponse.json({ message: 'Company deleted successfully' });
    } catch (error: any) {
        console.error('Delete Company Error:', error);
        return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
    }
}
