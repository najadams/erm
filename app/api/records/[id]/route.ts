import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const record = await prisma.record.findUnique({
      where: { id },
      include: { user: { select: { name: true } } }
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const json = await request.json();
    
    const record = await prisma.record.update({
      where: { id },
      data: json,
    });
    
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
     const { id } = params;
     await prisma.record.delete({ where: { id } });
     return NextResponse.json({ success: true });
  } catch (error) {
     return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
