import { NextRequest, NextResponse } from 'next/server';
import { checkRetention, processDisposition } from '@/lib/retention';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // 1. Auth Check (Support both Admin Session and API Secret)
        const session = await getServerSession(authOptions);
        const authHeader = request.headers.get('authorization');
        
        const isAuthorized = 
            (session && (session.user as any).role === 'ADMIN') || 
            (authHeader === `Bearer ${process.env.CRON_SECRET}`);

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Check for expired records
        const expiredRecords = await checkRetention();
        
        if (expiredRecords.length === 0) {
            return NextResponse.json({ 
                success: true, 
                processedCount: 0,
                message: 'No records pending disposition.'
            });
        }

        // 3. Process them
        const results = await processDisposition(expiredRecords);
        const processed = results.filter(r => r.success && !r.skipped).length;

        return NextResponse.json({ 
            success: true, 
            processedCount: processed,
            message: `Identified ${processed} records ready for disposition.`
        });
    } catch (error: any) {
        console.error('Retention Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
