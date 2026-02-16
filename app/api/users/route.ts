import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from 'bcryptjs';
import { invalidateForUser } from '@/lib/access-cache';
import { invalidateCache, CacheKeys } from '@/lib/cache';

const EVERYONE_GROUP_ID = '00000000-0000-0000-0000-000000000000';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Only Admin can create users directly
  if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, password, role, clearanceLevel, departmentId, groupIds } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare groups to connect
    // 1. Always 'Everyone'
    // 2. Any explicit groupIds
    const groupsToConnect = [{ id: EVERYONE_GROUP_ID }];
    if (groupIds && Array.isArray(groupIds)) {
        groupIds.forEach((gid: string) => {
            if (gid !== EVERYONE_GROUP_ID) groupsToConnect.push({ id: gid });
        });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'USER',
        clearanceLevel: clearanceLevel || 1,
        departmentId: departmentId || null,
        groups: {
           connect: groupsToConnect
        }
      }
    });

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error('Create User Error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  try {
    const users = await prisma.user.findMany({
      where: q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ]
      } : {},
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        clearanceLevel: true,
        department: { select: { id: true, name: true } },
        groups: { select: { id: true, name: true, type: true } }
      },
      take: 20
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Search Users Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Only Admin can update users
  if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, role, clearanceLevel, departmentId, accountExpiresAt, groupIds } = body;

    if (!id) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // 1. Update basic fields
    const updateData: any = {
        name,
        role,
        clearanceLevel,
        departmentId,
        accountExpiresAt: accountExpiresAt ? new Date(accountExpiresAt) : null,
    };

    // 1.5 Handle Password Update (if provided)
    const { password } = body;
    if (password && typeof password === 'string' && password.trim().length > 0) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
    }

    // 2. Handle Groups (if provided)
    if (groupIds && Array.isArray(groupIds)) {
        // Always ensure Everyone group is included if we are resetting groups?
        // Actually, let's just use set to replace all groups
        // But we MUST keep "Everyone System" group
        const targetGroupIds = new Set(groupIds);
        targetGroupIds.add(EVERYONE_GROUP_ID);
        
        updateData.groups = {
            set: Array.from(targetGroupIds).map(gid => ({ id: gid }))
        };
    }

    const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, groups: { select: { id: true, name: true } } }
    });

    // Invalidate access caches when role/clearance/department change
    await invalidateForUser(id);
    await invalidateCache(CacheKeys.acs(id));

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('Update User Error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const reactivate = searchParams.get('reactivate') === 'true';

  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  try {
      // Toggle Active Status
      if (searchParams.has('reactivate')) {
          const updatedUser = await prisma.user.update({
              where: { id },
              data: { isActive: reactivate },
              select: { id: true, isActive: true }
          });
          return NextResponse.json(updatedUser);
      } 
      
      // Hard Delete (Optional, if needed, but safer to just return error or soft delete)
      // For now, let's treat generic DELETE as deactivation unless specified otherwise?
      // But frontend sends reactivate=false for deactivation.
      // If no param, assume hard delete or soft delete? 
      // Let's implement Soft Delete (deactivate) as default if no reactivate param
      
      const updatedUser = await prisma.user.update({
          where: { id },
          data: { isActive: false },
           select: { id: true, isActive: true }
      });

      // Invalidate deactivated user's access cache
      await invalidateForUser(id);
      await invalidateCache(CacheKeys.acs(id));

      return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('Delete/Deactivate User Error:', error);
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
}
