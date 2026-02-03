-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('SUBMITTING', 'EXTRACTING', 'EXTRACTED', 'INVALID', 'FAILED');

-- CreateTable
CREATE TABLE "extractions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "status" "ExtractionStatus" NOT NULL,
    "date" TIMESTAMP(3),
    "currency" VARCHAR(3),
    "vendor_name" TEXT,
    "items" JSONB,
    "tax" DECIMAL(10,2),
    "total" DECIMAL(10,2),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extractions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extractions_id_created_at_idx" ON "extractions"("id", "created_at");

-- CreateIndex
CREATE INDEX "extractions_status_idx" ON "extractions"("status");
