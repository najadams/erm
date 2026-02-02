import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { ACS } from '@/lib/acs';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  try {
    // Permission check
    const canView = await ACS.evaluate(userId, id, 'VIEW');
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the requested version or latest
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('versionId');

    let version;
    if (versionId) {
      version = await prisma.recordVersion.findFirst({
        where: { id: versionId, recordId: id }
      });
    } else {
      version = await prisma.recordVersion.findFirst({
        where: { recordId: id },
        orderBy: { versionNumber: 'desc' }
      });
    }

    if (!version || !version.filePath) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Extract S3 key from the stored filePath
    let s3Key = version.filePath;
    const bucketPrefix = `/${BUCKET_NAME}/`;
    const bucketIdx = s3Key.indexOf(bucketPrefix);
    if (bucketIdx !== -1) {
      s3Key = s3Key.substring(bucketIdx + bucketPrefix.length);
    }

    // Fetch from S3/MinIO
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const s3Response = await s3Client.send(command);

    if (!s3Response.Body) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    // Determine filename for Content-Disposition
    const parts = s3Key.split('/');
    const fileName = parts[parts.length - 1] || 'download';
    const cleanName = fileName.replace(/^\d+-/, '');

    // Audit log: FILE_DOWNLOADED (fire-and-forget to not block the download)
    prisma.auditLog.create({
      data: {
        action: 'FILE_DOWNLOADED',
        recordId: id,
        userId,
        actorRole: userRole,
        source: 'API',
        newValue: JSON.stringify({
          versionId: version.id,
          versionNumber: version.versionNumber,
          fileName: cleanName,
          fileType: version.fileType,
          fileSize: s3Response.ContentLength || null
        })
      }
    }).catch(err => console.error('Failed to log download audit:', err));

    // Stream the file back
    const stream = s3Response.Body as ReadableStream;

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': version.fileType || s3Response.ContentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(cleanName)}"`,
        ...(s3Response.ContentLength ? { 'Content-Length': String(s3Response.ContentLength) } : {}),
      },
    });

  } catch (error: any) {
    console.error('Download Error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
