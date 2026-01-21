
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
      // Fetch settings 
      // We can fetch all or specific. Let's fetch the relevant ones.
      const setting = await prisma.systemSetting.findUnique({
          where: { key: 'ALLOW_USER_UPLOADS' }
      });
      
      // Default true if not set
      const allowUserUploads = setting ? JSON.parse(setting.value) : true;
      
      return NextResponse.json({ allowUserUploads });
  } catch (error) {
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!user || user.role !== ROLES.ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { allowUserUploads } = body;

        await prisma.systemSetting.upsert({
            where: { key: 'ALLOW_USER_UPLOADS' },
            update: { value: JSON.stringify(allowUserUploads) },
            create: { 
                key: 'ALLOW_USER_UPLOADS', 
                value: JSON.stringify(allowUserUploads),
                description: 'Toggle to allow non-admin users to upload files.'
            }
        });

        // Audit Log? (Optional but good practice)
        
        return NextResponse.json({ success: true, allowUserUploads });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
