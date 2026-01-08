
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import archiver from 'archiver';
import { PassThrough } from 'stream';

// Note: In real implementation, this should trigger a background job for large sets.
// For this compliance demo, we stream a small zip.

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { recordIds } = body;

        if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
            return NextResponse.json({ error: 'No records selected' }, { status: 400 });
        }

        // 1. Fetch Records
        const records = await prisma.record.findMany({
            where: { id: { in: recordIds } },
            include: {
                metadata: { include: { metadataField: true } },
                versions: { orderBy: { versionNumber: 'desc' }, take: 1 } // Get latest
            }
        });

        if (records.length === 0) {
             return NextResponse.json({ error: 'Records not found' }, { status: 404 });
        }

        // 2. Prepare Zip Stream
        const archive = archiver('zip', { zlib: { level: 9 } });
        const stream = new PassThrough();

        // 3. Add Metadata JSON
        const metadataExport = records.map(r => ({
            id: r.id,
            title: r.title,
            referenceNumber: r.referenceNumber,
            status: r.status,
            createdAt: r.createdAt,
            metadata: r.metadata.map(m => ({ [m.metadataField.name]: m.value }))
        }));
        archive.append(JSON.stringify(metadataExport, null, 2), { name: 'export_manifest.json' });

        // 4. Add Files (Mocking adding file content, as we only have S3/Local URLs)
        // In real app, we would fetch streams from S3.
        // For audit demo, we'll add a placeholder text file for each record.
        records.forEach(r => {
            const current = r.versions[0];
            if (current) {
                archive.append(`File Content Placeholder for ${current.filePath}`, { name: `${r.referenceNumber || r.id}_v${current.versionNumber}.txt` });
            }
        });

        archive.finalize();

        return new NextResponse(stream as any, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="e_discovery_export_${Date.now()}.zip"`
            }
        });

    } catch (error: any) {
        console.error('Export Error:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
