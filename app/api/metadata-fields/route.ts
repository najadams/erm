import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

async function canManageClassifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  const userRole = (session.user as any)?.role;
  return hasPermission(userRole, PERMISSIONS.MANAGE_CLASSIFICATIONS) || userRole === 'ADMIN';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchable = searchParams.get('searchable');
    const dataType = searchParams.get('dataType');

    const where: any = {};
    if (searchable === 'true') where.searchable = true;
    if (dataType) where.dataType = dataType;

    const fields = await prisma.metadataField.findMany({
      where,
      include: {
        _count: {
          select: {
            templateFields: true,
            recordValues: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(fields);
  } catch (error: any) {
    console.error('Error fetching metadata fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata fields', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await canManageClassifications()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, label, dataType, required, searchable, validationRules, enumValues } = body;

    if (!name || !label || !dataType) {
      return NextResponse.json(
        { error: 'name, label, and dataType are required' },
        { status: 400 }
      );
    }

    // Validate dataType
    const validDataTypes = ['text', 'number', 'date', 'datetime', 'boolean', 'enum', 'email', 'url', 'user', 'multiselect'];
    if (!validDataTypes.includes(dataType)) {
      return NextResponse.json(
        { error: `Invalid dataType. Must be one of: ${validDataTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // If enum type, enumValues must be provided
    if (dataType === 'enum' && !enumValues) {
      return NextResponse.json(
        { error: 'enumValues is required for enum dataType' },
        { status: 400 }
      );
    }

    const field = await prisma.metadataField.create({
      data: {
        name,
        label,
        dataType,
        required: required || false,
        searchable: searchable || false,
        validationRules: validationRules ? JSON.stringify(validationRules) : null,
        enumValues: enumValues ? JSON.stringify(enumValues) : null,
      }
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error: any) {
    console.error('Error creating metadata field:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A field with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create metadata field', details: error.message },
      { status: 500 }
    );
  }
}


