-- Enable pgvector extension (bắt buộc phải chạy trước khi tạo cột kiểu
-- "vector" bên dưới). Idempotent — an toàn khi chạy lại nhiều lần, và
-- cần thiết vì Neon (cũng như shadow database Prisma tự dựng khi chạy
-- `prisma migrate dev`) không tự bật extension theo mặc định.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "token_count" INTEGER NOT NULL,
    "section" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunk_embeddings" (
    "chunk_id" TEXT NOT NULL,
    "vector" vector,
    "embedding_model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chunk_embeddings_pkey" PRIMARY KEY ("chunk_id")
);

-- CreateIndex
CREATE INDEX "knowledge_chunks_document_id_idx" ON "knowledge_chunks"("document_id");

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "knowledge_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;