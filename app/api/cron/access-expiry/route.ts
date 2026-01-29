import { NextRequest, NextResponse } from 'next/server';
import { processExpiredAccess } from '@/lib/accessExpiry';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Auth: Admin session OR CRON_SECRET bearer token
        const session = await getServerSession(authOptions);
        const authHeader = request.headers.get('authorization');

        const isAuthorized =
            (session && (session.user as any).role === 'ADMIN') ||
            (authHeader === `Bearer ${process.env.CRON_SECRET}`);

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const count = await processExpiredAccess();

        return NextResponse.json({
            success: true,
            processedCount: count,
            message: `Revoked ${count} expired access grants.`
        });
    } catch (error: any) {
        console.error('Access Expiry Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
