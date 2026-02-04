import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { ACS } from '@/lib/acs';
import * as mammoth from 'mammoth';

// File types that can be previewed inline
const PREVIEWABLE_TYPES = {
  pdf: ['application/pdf'],
  image: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

function getPreviewCategory(mimeType: string): 'pdf' | 'image' | 'docx' | null {
  if (PREVIEWABLE_TYPES.pdf.includes(mimeType)) return 'pdf';
  if (PREVIEWABLE_TYPES.image.includes(mimeType)) return 'image';
  if (PREVIEWABLE_TYPES.docx.includes(mimeType)) return 'docx';
  return null;
}

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
    // Permission check - VIEW access allows preview
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

    const mimeType = version.fileType || 'application/octet-stream';
    const previewCategory = getPreviewCategory(mimeType);

    if (!previewCategory) {
      return NextResponse.json({
        error: 'Preview not supported for this file type',
        fileType: mimeType,
        supportedTypes: Object.values(PREVIEWABLE_TYPES).flat()
      }, { status: 415 });
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

    // Audit log: FILE_PREVIEWED
    prisma.auditLog.create({
      data: {
        action: 'FILE_PREVIEWED',
        recordId: id,
        userId,
        actorRole: userRole,
        source: 'API',
        newValue: JSON.stringify({
          versionId: version.id,
          versionNumber: version.versionNumber,
          fileType: version.fileType,
        })
      }
    }).catch(err => console.error('Failed to log preview audit:', err));

    // Handle DOCX conversion to HTML
    if (previewCategory === 'docx') {
      const chunks: Uint8Array[] = [];
      const reader = s3Response.Body.transformToWebStream().getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const buffer = Buffer.concat(chunks);

      const result = await mammoth.convertToHtml({ buffer });

      // Wrap in basic HTML with styling
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ddd; padding: 8px; }
    th { background-color: #f5f5f5; }
  </style>
</head>
<body>
  ${result.value}
</body>
</html>`;

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'private, max-age=300',
        },
      });
    }

    // For PDF and images, stream directly with inline disposition
    const stream = s3Response.Body as ReadableStream;
    const parts = s3Key.split('/');
    const fileName = parts[parts.length - 1] || 'preview';
    const cleanName = fileName.replace(/^\d+-/, '');

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(cleanName)}"`,
        'Cache-Control': 'private, max-age=300',
        ...(s3Response.ContentLength ? { 'Content-Length': String(s3Response.ContentLength) } : {}),
      },
    });

  } catch (error: any) {
    console.error('Preview Error:', error);
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 });
  }
}
