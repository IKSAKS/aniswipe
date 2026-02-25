/*
  Warnings:

  - You are about to drop the column `votes` on the `anime` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "pwd" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER'
);
INSERT INTO "new_User" ("email", "id", "name", "pwd") SELECT "email", "id", "name", "pwd" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_anime" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "images" JSONB,
    "genres" JSONB,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_anime" ("fetchedAt", "genres", "id", "images", "synopsis", "title") SELECT "fetchedAt", "genres", "id", "images", "synopsis", "title" FROM "anime";
DROP TABLE "anime";
ALTER TABLE "new_anime" RENAME TO "anime";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
