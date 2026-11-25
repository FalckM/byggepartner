-- CreateEnum
CREATE TYPE "Category" AS ENUM ('CPU', 'MOTHERBOARD', 'RAM', 'GPU', 'STORAGE', 'PSU', 'CASE', 'COOLER', 'OS', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "Stock" AS ENUM ('IN_STOCK', 'LOW', 'ORDER', 'OUT');

-- CreateEnum
CREATE TYPE "BuildTier" AS ENUM ('SAVE', 'RECOMMENDED', 'PERFORMANCE', 'CUSTOM', 'UPGRADE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('SIMULATED');

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceNok" INTEGER NOT NULL,
    "stock" "Stock" NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "plainSummary" TEXT NOT NULL,
    "tierLabel" TEXT,
    "specs" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "isDemoData" BOOLEAN NOT NULL DEFAULT true,
    "incompleteForValidation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "genre" TEXT NOT NULL,
    "gpuWeight" DOUBLE PRECISION NOT NULL,
    "cpuWeight" DOUBLE PRECISION NOT NULL,
    "baseFps" JSONB NOT NULL,
    "fpsCap" INTEGER,
    "esports" BOOLEAN NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Build" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs" JSONB,
    "tier" "BuildTier" NOT NULL,
    "items" JSONB NOT NULL,
    "totalNok" INTEGER NOT NULL,
    "validation" JSONB,
    "assemblyService" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalNok" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'SIMULATED',
    "anonymousId" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSession" (
    "id" TEXT NOT NULL,
    "participantCode" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "confidenceScore" INTEGER,
    "notes" TEXT,

    CONSTRAINT "TestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "anonymousId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Component_category_priceNok_idx" ON "Component"("category", "priceNok");

-- CreateIndex
CREATE INDEX "Component_source_idx" ON "Component"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE INDEX "Order_buildId_idx" ON "Order"("buildId");

-- CreateIndex
CREATE INDEX "TestSession_participantCode_idx" ON "TestSession"("participantCode");

-- CreateIndex
CREATE INDEX "Event_type_ts_idx" ON "Event"("type", "ts");

-- CreateIndex
CREATE INDEX "Event_sessionId_idx" ON "Event"("sessionId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
