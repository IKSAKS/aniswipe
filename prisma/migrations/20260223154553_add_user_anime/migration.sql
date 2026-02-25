-- CreateTable
CREATE TABLE "UserAnime" (
    "userId" INTEGER NOT NULL,
    "animeId" INTEGER NOT NULL,
    "liked" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "animeId"),
    CONSTRAINT "UserAnime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
