import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasPermission } from '@/lib/permissions';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME, getPublicUrl } from "@/lib/s3";
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> } // params is a Promise in Next.js 15+ 
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const user = session.user as any;

  try {
    // 1. Fetch Record to check permissions and status
    const record = await prisma.record.findUnique({
      where: { id },
      include: { 
          versions: { 
              orderBy: { versionNumber: 'desc' },
              take: 1
          } 
      }
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // 2. Permission Check
    // Standard logic: Owner can update drafts. Admins can update most things.
    // Additional: "Version Upload" permission might exist.
    // For now, let's assume if you can Edit the record, you can add a version.
    const isOwner = record.ownerUserId === user.id;
    const canManage = hasPermission(user.role, 'VERIFY_SUBMISSION');
    
    // Strict Lock: If ARCHIVED or DISPOSED, cannot add version without special permission or restoring first.
    if (['ARCHIVED', 'DISPOSED'].includes(record.status) && !canManage) {
        return NextResponse.json({ error: 'Cannot add versions to a finalized/archived record.' }, { status: 403 });
    }

    if (!isOwner && !canManage) {
         // Check shared access? For now, simplistic.
         return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // 3. Process File Upload
    let formData;
    try {
        formData = await request.formData();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid Form Data' }, { status: 400 });
    }

    const file = formData.get('file') as File;
    const changeNote = formData.get('changeNote') as string || '';

    if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 4. Upload to S3
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Calculate Checksum
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    const calculatedChecksum = hash.digest('hex');

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
    }));

    const fileUrl = getPublicUrl(fileName);

    // 5. Determine New Version Number
    const lastVersion = record.versions[0]?.versionNumber || 0;
    const newVersionNumber = lastVersion + 1;

    // 6. Transaction: Create Version + Update Record + Audit
    const newVersion = await prisma.$transaction(async (tx: any) => {
        const v = await tx.recordVersion.create({
            data: {
                recordId: id,
                versionNumber: newVersionNumber,
                filePath: fileUrl,
                fileType: file.type || 'unknown',
                uploadedById: user.id,
                checksum: calculatedChecksum,
                changeNote: changeNote
            }
        });

        // Update Record updated_at automatically, but maybe set status back to DRAFT if it was ACTIVE?
        // Logic: Validating a new version usually requires review.
        // If it's a "minor" edit, maybe not.
        // For safety/compliance: If Record is ACTIVE, adding a new version might reset it to SUBMITTED or require Verification?
        // Let's keep it simple for now: Status remains, but we might want to flag it.
        // User request didn't specify, so just adding version.
        
        await tx.auditLog.create({
            data: {
                action: 'UPLOAD_VERSION',
                recordId: id,
                userId: user.id,
                actorRole: user.role,
                source: 'API',
                newValue: JSON.stringify({ version: newVersionNumber, file: fileName })
            }
        });

        return v;
    });

    return NextResponse.json(newVersion);

  } catch (error: any) {
    console.error('Version Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
  }
}
