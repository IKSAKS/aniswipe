/*
  Warnings:

  - You are about to drop the column `votes` on the `anime` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lietotajs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "pwd" TEXT NOT NULL,
    "vards" TEXT,
    "loma" TEXT NOT NULL DEFAULT 'LIETOTAJS'
);
INSERT INTO "new_Lietotajs" ("email", "id", "vards", "pwd") SELECT "email", "id", "vards", "pwd" FROM "Lietotajs";
DROP TABLE "Lietotajs";
ALTER TABLE "new_Lietotajs" RENAME TO "Lietotajs";
CREATE UNIQUE INDEX "Lietotajs_email_key" ON "Lietotajs"("email");
CREATE TABLE "new_anime" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "images" JSONB,
    "zanrss" JSONB,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_anime" ("fetchedAt", "zanrss", "id", "images", "synopsis", "title") SELECT "fetchedAt", "zanrss", "id", "images", "synopsis", "title" FROM "anime";
DROP TABLE "anime";
ALTER TABLE "new_anime" RENAME TO "anime";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
