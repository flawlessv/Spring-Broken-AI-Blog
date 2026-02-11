import { ChromaClient, Collection } from "chromadb";

export interface VectorStore {
  upsert(vectors: Vector[]): Promise<string[]>;
  search(
    queryVector: number[],
    options?: SearchOptions
  ): Promise<SearchResult[]>;
  delete(ids: string[]): Promise<void>;
}

export interface Vector {
  id?: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  document?: string;
}

export interface SearchOptions {
  limit?: number;
  filters?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
  document?: string;
}

/**
 * Chroma 向量存储 (开源免费)
 * 连接到 Chroma 服务器 (默认 localhost:8000)
 */
class ChromaVectorStore implements VectorStore {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private collectionName = "blog_posts";
  private initialized = false;

  constructor() {
    // 兼容两套环境变量命名：CHROMADB_*（文档）和 CHROMA_*（历史）
    const host =
      process.env.CHROMADB_HOST || process.env.CHROMA_HOST || "localhost";
    const port = parseInt(
      process.env.CHROMADB_PORT || process.env.CHROMA_PORT || "8000",
      10
    );
    this.client = new ChromaClient({ host, port });
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
      });
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize Chroma collection:", error);
      throw error;
    }
  }

  async upsert(vectors: Vector[]): Promise<string[]> {
    await this.initialize();

    const ids = vectors.map((v, i) => v.id || `vec_${Date.now()}_${i}`);
    const embeddings = vectors.map((v) => v.embedding);
    const metadatas = vectors.map(
      (v) => v.metadata as Record<string, string | number | boolean>
    );
    const documents = vectors.map((v) => v.document || "");

    await this.collection!.upsert({
      ids,
      embeddings,
      metadatas,
      documents,
    });

    return ids;
  }

  async search(
    queryVector: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    await this.initialize();

    const results = await this.collection!.query({
      queryEmbeddings: [queryVector],
      nResults: options.limit || 5,
      where: options.filters as
        | Record<string, string | number | boolean>
        | undefined,
    });

    return (results.ids[0] || []).map((id, i) => ({
      id: id as string,
      score: 1 - (results.distances?.[0]?.[i] || 0), // 转换为相似度分数
      metadata: (results.metadatas?.[0]?.[i] as Record<string, unknown>) || {},
      document: results.documents?.[0]?.[i] as string,
    }));
  }

  async delete(ids: string[]): Promise<void> {
    await this.initialize();
    await this.collection!.delete({ ids });
  }
}

// 工厂函数
export function createVectorStore(): VectorStore {
  const provider = process.env.VECTOR_DB_PROVIDER || "chroma";

  switch (provider) {
    case "chroma":
      return new ChromaVectorStore();
    default:
      throw new Error(`Unsupported vector store: ${provider}`);
  }
}

// 单例
let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = createVectorStore();
  }
  return vectorStoreInstance;
}
