import { NextRequest, NextResponse } from 'next/server';
import { processDispositionQueue } from '@/lib/retention';
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

        // 2. Process Queue
        const count = await processDispositionQueue();

        return NextResponse.json({ 
            success: true, 
            processedCount: count,
            message: `Identified ${count} records ready for disposition.`
        });
    } catch (error: any) {
        console.error('Retention Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
