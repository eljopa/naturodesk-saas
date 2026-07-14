-- CreateEnum
CREATE TYPE "BlogCluster" AS ENUM ('INSTALLATION', 'REGLEMENTATION_JURIDIQUE', 'ACQUISITION_CLIENTELE', 'COMMUNICATION_VISIBILITE', 'GESTION_OUTILS', 'DEVELOPPEMENT_ACTIVITE');

-- CreateEnum
CREATE TYPE "BlogPersona" AS ENUM ('INSTALLATION', 'CROISSANCE', 'LES_DEUX');

-- CreateEnum
CREATE TYPE "BlogContentType" AS ENUM ('GUIDE', 'TUTORIEL', 'COMPARATIF', 'PREUVE');

-- CreateEnum
CREATE TYPE "BlogTopicStatus" AS ENUM ('PLANNED', 'GENERATING', 'GENERATED', 'REVIEW_REQUIRED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "BlogArticleStatus" AS ENUM ('DRAFT', 'REVIEW_REQUIRED', 'PUBLISHED', 'UNPUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "BlogTone" AS ENUM ('PEDAGOGIQUE', 'RETOUR_EXPERIENCE', 'ANALYTIQUE', 'JOURNALISTIQUE', 'PRATIQUE', 'EXPERT');

-- CreateEnum
CREATE TYPE "BlogDepth" AS ENUM ('COURTE', 'MOYENNE', 'LONGUE', 'APPROFONDIE');

-- CreateEnum
CREATE TYPE "BlogStructure" AS ENUM ('LINEAIRE', 'MODULAIRE', 'MIXTE');

-- CreateTable
CREATE TABLE "blog_topics" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cluster" "BlogCluster" NOT NULL,
    "persona" "BlogPersona" NOT NULL,
    "contentType" "BlogContentType" NOT NULL,
    "keyword" TEXT NOT NULL,
    "secondaryKeywords" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 100,
    "pillarSlug" TEXT,
    "relatedSlugs" TEXT[],
    "naturodeskContext" TEXT NOT NULL,
    "status" "BlogTopicStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_articles" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "metaTitle" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL,
    "heroImageUrl" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "toneUsed" "BlogTone" NOT NULL,
    "depthUsed" "BlogDepth" NOT NULL,
    "structureUsed" "BlogStructure" NOT NULL,
    "blocksUsed" TEXT[],
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "status" "BlogArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "generationLog" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_topics_slug_key" ON "blog_topics"("slug");

-- CreateIndex
CREATE INDEX "blog_topics_status_idx" ON "blog_topics"("status");

-- CreateIndex
CREATE INDEX "blog_topics_cluster_idx" ON "blog_topics"("cluster");

-- CreateIndex
CREATE INDEX "blog_articles_status_idx" ON "blog_articles"("status");

-- CreateIndex
CREATE INDEX "blog_articles_locale_idx" ON "blog_articles"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "blog_articles_topicId_locale_key" ON "blog_articles"("topicId", "locale");

-- AddForeignKey
ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "blog_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
