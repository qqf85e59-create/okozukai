
-- CreateTable
CREATE TABLE "YenLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deltaYen" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "YenLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deltaMinutes" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChoreItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bonusMinutes" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'FIXED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChoreItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserChoreOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "choreItemId" TEXT NOT NULL,
    "bonusMinutes" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserChoreOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserChoreOverride_choreItemId_fkey" FOREIGN KEY ("choreItemId") REFERENCES "ChoreItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PenaltyItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "penaltyMinutes" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'FIXED',
    "unitLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PenaltyItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPenaltyOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "penaltyItemId" TEXT NOT NULL,
    "penaltyMinutes" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserPenaltyOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPenaltyOverride_penaltyItemId_fkey" FOREIGN KEY ("penaltyItemId") REFERENCES "PenaltyItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "studiedAt" DATETIME NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "rejectedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChoreClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "choreItemId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "actualValue" INTEGER,
    "totalMinutes" INTEGER NOT NULL,
    "performedAt" DATETIME NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "rejectedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChoreClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChoreClaim_choreItemId_fkey" FOREIGN KEY ("choreItemId") REFERENCES "ChoreItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PenaltyEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "penaltyItemId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "actualValue" INTEGER,
    "totalMinutes" INTEGER NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PenaltyEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PenaltyEvent_penaltyItemId_fkey" FOREIGN KEY ("penaltyItemId") REFERENCES "PenaltyItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeConvert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "minutesUsed" INTEGER NOT NULL,
    "yenGained" INTEGER NOT NULL,
    "rateSnapshot" INTEGER NOT NULL DEFAULT 500,
    "convertedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeConvert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashOut" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "grossYen" INTEGER NOT NULL,
    "feeYen" INTEGER NOT NULL DEFAULT 500,
    "netYen" INTEGER NOT NULL,
    "approvedById" TEXT NOT NULL,
    "note" TEXT,
    "cashedOutAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashOut_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeConsume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "minutesUsed" INTEGER NOT NULL,
    "memo" TEXT,
    "consumedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeConsume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "virtualMemberId" TEXT,
    "role" TEXT NOT NULL,
    CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventParticipant_virtualMemberId_fkey" FOREIGN KEY ("virtualMemberId") REFERENCES "VirtualMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EventParticipant" ("eventId", "id", "role", "userId", "virtualMemberId") SELECT "eventId", "id", "role", "userId", "virtualMemberId" FROM "EventParticipant";
DROP TABLE "EventParticipant";
ALTER TABLE "new_EventParticipant" RENAME TO "EventParticipant";
CREATE TABLE "new_SavingsGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "memo" TEXT,
    "isAchieved" BOOLEAN NOT NULL DEFAULT false,
    "targetDate" DATETIME,
    "linkedEventId" TEXT,
    "dailySuggestedAmount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavingsGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SavingsGoal_linkedEventId_fkey" FOREIGN KEY ("linkedEventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SavingsGoal" ("createdAt", "dailySuggestedAmount", "id", "isAchieved", "linkedEventId", "memo", "targetAmount", "targetDate", "title", "userId") SELECT "createdAt", "dailySuggestedAmount", "id", "isAchieved", "linkedEventId", "memo", "targetAmount", "targetDate", "title", "userId" FROM "SavingsGoal";
DROP TABLE "SavingsGoal";
ALTER TABLE "new_SavingsGoal" RENAME TO "SavingsGoal";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "birthDate" DATETIME,
    "gradeOverride" TEXT,
    "exchangeRate" REAL,
    "colorToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("birthDate", "colorToken", "createdAt", "displayName", "exchangeRate", "familyId", "gradeOverride", "id", "isActive", "mustChangePassword", "passwordHash", "role") SELECT "birthDate", "colorToken", "createdAt", "displayName", "exchangeRate", "familyId", "gradeOverride", "id", "isActive", "mustChangePassword", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE TABLE "new_UserBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserBadge" ("badgeId", "earnedAt", "id", "userId") SELECT "badgeId", "earnedAt", "id", "userId" FROM "UserBadge";
DROP TABLE "UserBadge";
ALTER TABLE "new_UserBadge" RENAME TO "UserBadge";
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "YenLedger_userId_createdAt_idx" ON "YenLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TimeLedger_userId_createdAt_idx" ON "TimeLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChoreItem_familyId_sortOrder_idx" ON "ChoreItem"("familyId", "sortOrder");

-- CreateIndex
CREATE INDEX "UserChoreOverride_userId_idx" ON "UserChoreOverride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserChoreOverride_userId_choreItemId_key" ON "UserChoreOverride"("userId", "choreItemId");

-- CreateIndex
CREATE INDEX "PenaltyItem_familyId_sortOrder_idx" ON "PenaltyItem"("familyId", "sortOrder");

-- CreateIndex
CREATE INDEX "UserPenaltyOverride_userId_idx" ON "UserPenaltyOverride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPenaltyOverride_userId_penaltyItemId_key" ON "UserPenaltyOverride"("userId", "penaltyItemId");

-- CreateIndex
CREATE INDEX "StudyLog_userId_studiedAt_idx" ON "StudyLog"("userId", "studiedAt");

-- CreateIndex
CREATE INDEX "StudyLog_userId_status_idx" ON "StudyLog"("userId", "status");

-- CreateIndex
CREATE INDEX "ChoreClaim_userId_status_idx" ON "ChoreClaim"("userId", "status");

-- CreateIndex
CREATE INDEX "PenaltyEvent_userId_occurredAt_idx" ON "PenaltyEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "TimeConvert_userId_convertedAt_idx" ON "TimeConvert"("userId", "convertedAt");

-- CreateIndex
CREATE INDEX "CashOut_userId_cashedOutAt_idx" ON "CashOut"("userId", "cashedOutAt");

-- CreateIndex
CREATE INDEX "TimeConsume_userId_consumedAt_idx" ON "TimeConsume"("userId", "consumedAt");

