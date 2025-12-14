import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

import { getAccessibleRecordsClause } from '@/lib/access';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Enforce authentication
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  const status = searchParams.get('status');
  const groupId = searchParams.get('groupId') || searchParams.get('department');
  const uploaderId = searchParams.get('uploader');
  const tag = searchParams.get('tag'); // Single tag filter
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // 1. Build Search/Filter Clause
  const filters: any[] = [];

  // Text Search
  if (q) {
    filters.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { contains: q, mode: 'insensitive' } }, // Simple string match on JSON
      ]
    });
  }

  // Exact Filters
  if (status) filters.push({ status });
  if (groupId) filters.push({ groupId });
  if (uploaderId) filters.push({ userId: uploaderId });
  if (tag) filters.push({ tags: { contains: tag } }); // Approximate match

  // Date Range
  if (startDate || endDate) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    filters.push({ createdAt: dateFilter });
  }

  // 2. Build Access Control Clause
  // Cast session.user.id because types might be loose
  const accessClause = await getAccessibleRecordsClause((session.user as any).id);

  if (accessClause.id === 'nothing') {
     // User invalid or something went wrong with permissions
     return NextResponse.json({ error: 'Permission Check Failed' }, { status: 403 });
  }

  // 3. Combine All
  const where = {
    AND: [
      ...filters,
      accessClause
    ]
  };

  try {
    const records = await prisma.record.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        group: { select: { name: true } }
      }
    });

    // Map result to include uploader name in a flatter structure if needed, or just return as is
    const enrichedRecords = records.map(record => ({
      ...record,
      uploaderName: record.user?.name || record.user?.email || 'Unknown',
      groupName: record.group?.name
    }));

    return NextResponse.json(enrichedRecords);
  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch records', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string; 
    const visibility = formData.get('visibility') as string || 'PUBLIC';
    const groupId = formData.get('groupId') as string || undefined;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create unique filename
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const path = join(process.cwd(), 'public/uploads', filename);
    await writeFile(path, buffer);
    const fileUrl = `/uploads/${filename}`;
    
    const userId = (session.user as any).id;

    if (!userId) {
         return NextResponse.json({ error: 'User ID missing in session' }, { status: 500 });
    }

    const record = await prisma.record.create({
      data: {
        title,
        category,
        description: description || '',
        tags: tags || '', 
        fileUrl,
        fileType: file.name.split('.').pop() || 'unknown',
        status: 'active',
        userId: userId,
        visibility,
        groupId: groupId || null,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
