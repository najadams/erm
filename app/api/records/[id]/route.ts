import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Note: In a real app, use the same access control clause as the list view.
// For now, we'll do a simple check.

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const id = params.id;
    const record = await prisma.record.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },

        recordType: {
          include: {
            metadataFields: {
              include: { metadataField: true },
              orderBy: { displayOrder: 'asc' }
            }
          }
        },
        metadata: {
          include: { metadataField: true }
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { uploadedBy: { select: { name: true } } }
        }
      }
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // TODO: Add refined permission check here (e.g., is userId == owner or in group)

    return NextResponse.json(record);
  } catch (error) {
    console.error('Fetch Record Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await prisma.record.delete({ where: { id: params.id }});
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
