CREATE TABLE "WindfallIncome" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "note" TEXT,
  "recordedBy" TEXT NOT NULL,
  "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WindfallIncome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WindfallIncome_userId_idx" ON "WindfallIncome"("userId");

CREATE TABLE "SpendingRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "memo" TEXT,
  "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpendingRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SpendingRecord_userId_idx" ON "SpendingRecord"("userId");
