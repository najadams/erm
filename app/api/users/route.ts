import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// Helper to check admin
async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user && (session.user as any).role === 'ADMIN';
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  // Case 1: Search (Open to all Authenticated Users)
  if (query) {
      // Return SAFE subset of data for autocomplete
      try {
          const users = await prisma.user.findMany({
              where: {
                  OR: [
                      { name: { contains: query, mode: 'insensitive' } },
                      { email: { contains: query, mode: 'insensitive' } }
                  ]
              },
              select: { id: true, name: true, email: true, department: { select: { name: true } } },
              take: 10
          });
          return NextResponse.json(users);
      } catch (error) {
          return NextResponse.json({ error: 'Search failed' }, { status: 500 });
      }
  }

  // Case 2: List (Autocomplete/Default)
  // Allow all authenticated users to get a default list (e.g. recent or alphabetical)
  try {
     const users = await prisma.user.findMany({
       select: { id: true, name: true, email: true, department: { select: { name: true } } },
       orderBy: { name: 'asc' },
       take: 20
     });
     return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const body = await request.json();
    const { email, name, password, role, clearanceLevel, groupIds } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'USER',
        clearanceLevel: clearanceLevel ? parseInt(clearanceLevel) : 1,
        groups: groupIds ? {
            connect: groupIds.map((id: string) => ({ id }))
        } : undefined
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: any) {
    console.error('User creation error:', error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
    if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const body = await request.json();
        const { id, role, clearanceLevel, groupIds } = body;
        
        if (!id) return NextResponse.json({ error: 'Missing User ID' }, {status: 400});

        const updateData: any = {};
        if (role) updateData.role = role;
        if (clearanceLevel !== undefined) updateData.clearanceLevel = parseInt(clearanceLevel);
        if (groupIds) {
            updateData.groups = {
                set: groupIds.map((gid: string) => ({ id: gid }))
            };
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            include: { groups: true }
        });
        
        const { password: _, ...safeUser } = user;
        return NextResponse.json(safeUser);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
