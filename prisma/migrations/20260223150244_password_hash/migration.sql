/*
  Warnings:

  - You are about to drop the column `lietotajsUid` on the `Lietotajs` table. All the data in the column will be lost.
  - Added the required column `pwd` to the `Lietotajs` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lietotajs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "pwd" TEXT NOT NULL,
    "vards" TEXT
);
INSERT INTO "new_Lietotajs" ("email", "id", "vards") SELECT "email", "id", "vards" FROM "Lietotajs";
DROP TABLE "Lietotajs";
ALTER TABLE "new_Lietotajs" RENAME TO "Lietotajs";
CREATE UNIQUE INDEX "Lietotajs_email_key" ON "Lietotajs"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
