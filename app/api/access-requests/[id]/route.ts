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

    const accessRequest = await prisma.accessRequest.update({
        where: { id },
        data: { status }
    });

    if (status === 'APPROVED') {
        // Create the user automatically
        // Generate a random temp password if not provided? 
        // For MVP, we'll set a default temp password "welcome123"
        const tempPassword = await bcrypt.hash("welcome123", 10);
        
        // Check if user exists just in case
        const existingUser = await prisma.user.findUnique({ where: { email: accessRequest.email }});
        if (!existingUser) {
            await prisma.user.create({
                data: {
                    email: accessRequest.email,
                    name: accessRequest.name,
                    password: tempPassword,
                    role: 'STAFF'
                }
            });
        }
    }

    return NextResponse.json(accessRequest);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
