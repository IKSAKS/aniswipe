-- CreateTable
CREATE TABLE "Lietotajs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "vards" TEXT
);

-- CreateTable
CREATE TABLE "Zanrs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vards" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "LietotajsZanrs" (
    "lietotajsId" INTEGER NOT NULL,
    "zanrsId" INTEGER NOT NULL,
    "smagums" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("lietotajsId", "zanrsId"),
    CONSTRAINT "LietotajsZanrs_lietotajsId_fkey" FOREIGN KEY ("lietotajsId") REFERENCES "Lietotajs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LietotajsZanrs_zanrsId_fkey" FOREIGN KEY ("zanrsId") REFERENCES "Zanrs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Lietotajs_email_key" ON "Lietotajs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Zanrs_vards_key" ON "Zanrs"("vards");
