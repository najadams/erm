-- CreateTable
CREATE TABLE "RecordAccessRequest" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "requestedLevel" "AccessLevel" NOT NULL DEFAULT 'READ',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordAccessRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RecordAccessRequest" ADD CONSTRAINT "RecordAccessRequest_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordAccessRequest" ADD CONSTRAINT "RecordAccessRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordAccessRequest" ADD CONSTRAINT "RecordAccessRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
