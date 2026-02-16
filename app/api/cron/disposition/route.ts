import { NextRequest, NextResponse } from 'next/server';
import { checkRetention, processDisposition } from '@/lib/retention';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // CRON Authentication
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
      let totalProcessed = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      let cursor: string | undefined;
      let batchNum = 0;
      const MAX_BATCHES = 50; // Safety limit: don't run forever

      // Process in batches until no more records
      while (batchNum < MAX_BATCHES) {
          batchNum++;
          const expiredRecords = await checkRetention(cursor);
          
          if (expiredRecords.length === 0) break;

          const results = await processDisposition(expiredRecords);
          
          totalProcessed += results.filter(r => r.success && !r.skipped).length;
          totalSkipped += results.filter(r => r.skipped).length;
          totalFailed += results.filter(r => !r.success).length;

          // Set cursor for next batch
          cursor = expiredRecords[expiredRecords.length - 1].id;

          // If we got fewer than a full batch, we're done
          if (expiredRecords.length < 100) break;
      }

      return NextResponse.json({ 
          success: true, 
          batches: batchNum,
          processed: totalProcessed,
          skipped: totalSkipped,
          failed: totalFailed,
      });

  } catch (error: any) {
      console.error('Retention Cron Error:', error);
      return NextResponse.json({ error: 'Retention process failed', details: error.message }, { status: 500 });
  }
}
