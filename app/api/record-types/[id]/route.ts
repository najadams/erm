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

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!['ADMIN', 'RECORDS_OFFICER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, code, description, retentionYears, metadataFieldIds } = body;

    const updated = await prisma.recordType.update({
      where: { id: params.id },
      data: {
        name,
        code,
        description,
        retentionYears,
        metadataFields: metadataFieldIds ? {
          deleteMany: {},
          create: metadataFieldIds.map((fieldId: string, index: number) => ({
            metadataFieldId: fieldId,
            displayOrder: index,
            required: false
          }))
        } : undefined
      },
      include: { metadataFields: { include: { metadataField: true } } }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update RecordType Error:', error);
    return NextResponse.json({ error: 'Failed to update record type' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Check for linked records
    const recordType = await prisma.recordType.findUnique({
      where: { id: params.id },
      include: { _count: { select: { records: true } } }
    });

    if (!recordType) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }

    if (recordType._count.records > 0) {
      return NextResponse.json({
        error: 'Cannot delete record type with existing records'
      }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.recordTypeMetadata.deleteMany({ where: { recordTypeId: params.id } }),
      prisma.recordType.delete({ where: { id: params.id } })
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete RecordType Error:', error);
    return NextResponse.json({ error: 'Failed to delete record type' }, { status: 500 });
  }
}
