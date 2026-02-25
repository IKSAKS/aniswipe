-- CreateTable
CREATE TABLE "LietotajsAnime" (
    "lietotajsId" INTEGER NOT NULL,
    "animeId" INTEGER NOT NULL,
    "patik" BOOLEAN NOT NULL,
    "izveidots" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("lietotajsId", "animeId"),
    CONSTRAINT "LietotajsAnime_lietotajsId_fkey" FOREIGN KEY ("lietotajsId") REFERENCES "Lietotajs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
