import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
    const recordType = await prisma.recordType.findUnique({
      where: { id: params.id },
      include: {
        metadataFields: {
          include: {
            metadataField: true
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!recordType) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }

    return NextResponse.json(recordType);
  } catch (error) {
    console.error('Error fetching record type details:', error);
    return NextResponse.json({ error: 'Failed to fetch record type details' }, { status: 500 });
  }
}
