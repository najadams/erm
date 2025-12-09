import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  const status = searchParams.get('status');

  const where: any = {};

  if (q) {
    where.OR = [
      { title: { contains: q } }, // Case-insensitive not supported natively in SQLite Prisma without extensions, but standard 'contains' works ok for simple matches
      { category: { contains: q } },
      { description: { contains: q } },
    ];
  }

  if (status) {
    where.status = status;
  }

  try {
    const records = await prisma.record.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } } // Include uploader name
      }
    });
    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch records', details: error.message }, { status: 500 });
  }
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

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
    const tags = formData.get('tags') as string; // Expecting comma separated or JSON string
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create unique filename to avoid collisions
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const path = join(process.cwd(), 'public/uploads', filename);
    await writeFile(path, buffer);
    const fileUrl = `/uploads/${filename}`;
    
    // Create DB Record using session user ID
    // Note: We need to cast session.user to any to access 'id' if TS complains, 
    // or fix types. For MVP, (session.user as any).id is acceptable (defined in auth options)
    const userId = (session.user as any).id;

    if (!userId) {
         // Should not happen if auth configured right, but fallback
         return NextResponse.json({ error: 'User ID missing in session' }, { status: 500 });
    }

    const record = await prisma.record.create({
      data: {
        title,
        category,
        description: description || '',
        tags: tags || '', // Store directly as string for simplicity in MVP
        fileUrl,
        fileType: file.name.split('.').pop() || 'unknown',
        status: 'active',
        userId: userId,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
