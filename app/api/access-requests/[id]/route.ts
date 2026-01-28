import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user && (session.user as any).role === 'ADMIN';
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { id } = await params;
    const { status } = await request.json(); // APPROVED or REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Note: This endpoint handles AccountRequest (user registration requests)
    // For record/company access requests, use /api/records/[id]/access-request
    const accountRequest = await prisma.accountRequest.update({
        where: { id },
        data: { status }
    });

    if (status === 'APPROVED') {
        // Create the user automatically
        const tempPassword = await bcrypt.hash("welcome123", 10);

        // Check if user exists just in case
        const existingUser = await prisma.user.findUnique({ where: { email: accountRequest.email }});
        if (!existingUser) {
            await prisma.user.create({
                data: {
                    email: accountRequest.email,
                    name: accountRequest.name,
                    password: tempPassword,
                    role: 'CONTRIBUTOR'  // Default to CONTRIBUTOR role
                }
            });
        }
    }

    return NextResponse.json(accountRequest);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
