import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  
  const where: any = {};
  
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { registrationNumber: { contains: q, mode: 'insensitive' } },
      { tin: { contains: q, mode: 'insensitive' } }
    ];
  }

  try {
    const companies = await prisma.registeredCompany.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
            select: { records: true }
        }
      }
    });

    return NextResponse.json(companies);
  } catch (error: any) {
    console.error('Companies API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch companies', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
        name, 
        registrationNumber, 
        investorType, 
        sector, 
        tin, 
        contactDetails 
    } = body;

    // Validation
    if (!name || !registrationNumber || !investorType) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check Uniqueness
    const existing = await prisma.registeredCompany.findUnique({
        where: { registrationNumber }
    });
    if (existing) {
        return NextResponse.json({ error: 'Company with this Registration Number already exists.' }, { status: 409 });
    }

    const company = await prisma.registeredCompany.create({
      data: {
        name,
        registrationNumber,
        investorType,
        sector,
        tin,
        contactDetails: contactDetails ? JSON.stringify(contactDetails) : undefined
      }
    });

    return NextResponse.json(company);
  } catch (error: any) {
    console.error('Create Company Error:', error);
    return NextResponse.json({ error: 'Failed to create company', details: error.message }, { status: 500 });
  }
}
