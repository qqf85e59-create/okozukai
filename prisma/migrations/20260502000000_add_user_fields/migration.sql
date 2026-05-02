-- AlterTable: add new User fields (gradeOverride, exchangeRate, colorToken, isActive)
ALTER TABLE "User" ADD COLUMN "gradeOverride" TEXT;
ALTER TABLE "User" ADD COLUMN "exchangeRate" REAL;
ALTER TABLE "User" ADD COLUMN "colorToken" TEXT;
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
