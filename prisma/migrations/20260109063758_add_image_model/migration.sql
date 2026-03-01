-- CreateTable
CREATE TABLE "post_vector_indexes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "vectorId" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "indexedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "post_vector_indexes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CONTENT',
    "postId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "images_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT,
    "bio" TEXT,
    "avatar" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "wechat" TEXT,
    "qq" TEXT,
    "website" TEXT,
    "github" TEXT,
    "twitter" TEXT,
    "weibo" TEXT,
    "bilibili" TEXT,
    "youtube" TEXT,
    "location" TEXT,
    "company" TEXT,
    "position" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_profiles" ("avatar", "bio", "displayName", "github", "id", "twitter", "userId", "website") SELECT "avatar", "bio", "displayName", "github", "id", "twitter", "userId", "website" FROM "profiles";
DROP TABLE "profiles";
ALTER TABLE "new_profiles" RENAME TO "profiles";
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "post_vector_indexes_postId_key" ON "post_vector_indexes"("postId");

-- CreateIndex
CREATE INDEX "post_vector_indexes_postId_idx" ON "post_vector_indexes"("postId");

-- CreateIndex
CREATE INDEX "images_postId_idx" ON "images"("postId");

-- CreateIndex
CREATE INDEX "images_type_idx" ON "images"("type");
