-- DropForeignKey
ALTER TABLE "Record" DROP CONSTRAINT "Record_recordTypeId_fkey";

-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "classificationNodeId" TEXT,
ADD COLUMN     "templateVersion" INTEGER,
ALTER COLUMN "recordTypeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ClassificationNode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "parentId" TEXT,
    "code" TEXT,
    "isLeaf" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassificationNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetadataTemplate" (
    "id" TEXT NOT NULL,
    "classificationNodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetadataTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "metadataFieldId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "editable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassificationNode_organizationId_idx" ON "ClassificationNode"("organizationId");

-- CreateIndex
CREATE INDEX "ClassificationNode_parentId_idx" ON "ClassificationNode"("parentId");

-- CreateIndex
CREATE INDEX "ClassificationNode_level_idx" ON "ClassificationNode"("level");

-- CreateIndex
CREATE INDEX "MetadataTemplate_classificationNodeId_idx" ON "MetadataTemplate"("classificationNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "MetadataTemplate_classificationNodeId_version_key" ON "MetadataTemplate"("classificationNodeId", "version");

-- CreateIndex
CREATE INDEX "TemplateField_templateId_idx" ON "TemplateField"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateField_templateId_metadataFieldId_key" ON "TemplateField"("templateId", "metadataFieldId");

-- AddForeignKey
ALTER TABLE "ClassificationNode" ADD CONSTRAINT "ClassificationNode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationNode" ADD CONSTRAINT "ClassificationNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ClassificationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationNode" ADD CONSTRAINT "ClassificationNode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetadataTemplate" ADD CONSTRAINT "MetadataTemplate_classificationNodeId_fkey" FOREIGN KEY ("classificationNodeId") REFERENCES "ClassificationNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateField" ADD CONSTRAINT "TemplateField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MetadataTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateField" ADD CONSTRAINT "TemplateField_metadataFieldId_fkey" FOREIGN KEY ("metadataFieldId") REFERENCES "MetadataField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_recordTypeId_fkey" FOREIGN KEY ("recordTypeId") REFERENCES "RecordType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_classificationNodeId_fkey" FOREIGN KEY ("classificationNodeId") REFERENCES "ClassificationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
