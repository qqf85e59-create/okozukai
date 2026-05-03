-- Phase 1: Calendar & Family Models
-- Migration: 20260504000000_phase1_calendar_family

-- ─────────────────────────────────────────────────
-- 1. Create Family table
-- ─────────────────────────────────────────────────
CREATE TABLE "Family" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────
-- 2. Insert default Family for existing users
--    All existing users will be assigned to this family.
-- ─────────────────────────────────────────────────
INSERT INTO "Family" ("id", "name", "createdAt")
VALUES ('default_family_001', 'デフォルト家族', CURRENT_TIMESTAMP);

-- ─────────────────────────────────────────────────
-- 3. Add familyId to User
--    SQLite requires DEFAULT for NOT NULL column addition.
--    All existing rows get default_family_001.
-- ─────────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT 'default_family_001'
    REFERENCES "Family"("id");

-- ─────────────────────────────────────────────────
-- 4. Create VirtualMember table
-- ─────────────────────────────────────────────────
CREATE TABLE "VirtualMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "colorTag" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VirtualMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ─────────────────────────────────────────────────
-- 5. Create EventTemplate table (referenced by Event)
-- ─────────────────────────────────────────────────
CREATE TABLE "EventTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "defaultBudget" INTEGER,
    "defaultLeadDays" INTEGER,
    "description" TEXT,
    CONSTRAINT "EventTemplate_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ─────────────────────────────────────────────────
-- 6. Create Event table
-- ─────────────────────────────────────────────────
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "category" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "templateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EventTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Event_familyId_startAt_idx" ON "Event"("familyId", "startAt");

-- ─────────────────────────────────────────────────
-- 7. Create EventParticipant table
-- ─────────────────────────────────────────────────
CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "virtualMemberId" TEXT,
    "role" TEXT NOT NULL,
    CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventParticipant_virtualMemberId_fkey" FOREIGN KEY ("virtualMemberId") REFERENCES "VirtualMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ─────────────────────────────────────────────────
-- 8. Create EventComment table
-- ─────────────────────────────────────────────────
CREATE TABLE "EventComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventComment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "EventComment_eventId_createdAt_idx" ON "EventComment"("eventId", "createdAt");

-- ─────────────────────────────────────────────────
-- 9. Create EventReaction table
-- ─────────────────────────────────────────────────
CREATE TABLE "EventReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventReaction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EventReaction_eventId_userId_emoji_key" ON "EventReaction"("eventId", "userId", "emoji");

-- ─────────────────────────────────────────────────
-- 10. Create EventRetrospective table
-- ─────────────────────────────────────────────────
CREATE TABLE "EventRetrospective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "plannedAmount" INTEGER,
    "actualAmount" INTEGER,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventRetrospective_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EventRetrospective_eventId_key" ON "EventRetrospective"("eventId");

-- ─────────────────────────────────────────────────
-- 11. Extend SavingsGoal with new optional fields
-- ─────────────────────────────────────────────────
ALTER TABLE "SavingsGoal" ADD COLUMN "targetDate" DATETIME;
ALTER TABLE "SavingsGoal" ADD COLUMN "linkedEventId" TEXT
    REFERENCES "Event"("id");
ALTER TABLE "SavingsGoal" ADD COLUMN "dailySuggestedAmount" INTEGER;
