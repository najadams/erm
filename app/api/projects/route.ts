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

  const userId = (session.user as any).id;
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const visibility = searchParams.get('visibility');
  const registeredCompanyId = searchParams.get('registeredCompanyId');

  const where: any = {};

  if (status) {
      where.status = status;
  }
  
  if (registeredCompanyId) {
      where.registeredCompanyId = registeredCompanyId;
  }

  // Visibility Filter:
  // Projects I own OR Projects I am a member of OR Visible ORG projects
  where.OR = [
      { visibility: { in: ['ORG', 'RESTRICTED'] } }, 
      { ownerUserId: userId },
      { members: { some: { userId: userId } } }
  ];

  try {
    const project = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
      include: {
        owner: { select: { name: true, email: true } },
        // registeredCompany: { select: { name: true, registrationNumber: true } }, // REMOVED relation
        projectCompanies: {
            include: {
                company: { select: { id: true, name: true, registrationNumber: true } }
            }
        },
        _count: {
            select: { members: true, projectRecords: true }
        }
      }
      }
    });

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Projects API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const { 
        name, 
        description, 
        status, 
        visibility, 
        startDate, 
        endDate,
        type,
        priority,
        sector,
        registeredCompanyId,
        companies // Array of { companyId, role }
    } = body;

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate Reference Number
    // Format: PRJ-{YYYY}-{SEQ}
    const year = new Date().getFullYear();
    const count = await prisma.project.count();
    const sequence = (count + 1).toString().padStart(3, '0');
    const referenceNumber = `PRJ-${year}-${sequence}`;

    const projectData: any = {
        name,
        description,
        status: status || 'DRAFT',
        visibility: visibility || 'PRIVATE',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        
        // Governance Fields
        type: type || 'INVESTMENT',
        priority: priority || 'MEDIUM',
        sector,
        referenceNumber,

        ownerUserId: userId,
        // Add creator as MANAGER automatically
        members: {
            create: {
                userId: userId,
                role: 'MANAGER'
            }
        }
    };

    // Handle M:N Companies
    if (companies && Array.isArray(companies) && companies.length > 0) {
        projectData.projectCompanies = {
            create: companies.map((c: any) => ({
                companyId: c.companyId || c.id, // Handle both formats
                role: c.role || 'PRIMARY_INVESTOR'
            }))
        };
        // Set legacy field to the first one for backward compatibility
        projectData.registeredCompanyId = companies[0].companyId || companies[0].id;
    } else if (registeredCompanyId) {
        // Fallback for legacy requests
        projectData.registeredCompanyId = registeredCompanyId;
        projectData.projectCompanies = {
            create: [{
                companyId: registeredCompanyId,
                role: 'PRIMARY_INVESTOR'
            }]
        };
    }

    const project = await prisma.project.create({
      data: projectData
    });

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Create Project Error:', error);
    return NextResponse.json({ error: 'Failed to create project', details: error.message }, { status: 500 });
  }
}
