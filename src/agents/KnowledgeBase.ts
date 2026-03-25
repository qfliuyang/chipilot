import { Pinecone, Index, RecordMetadata } from "@pinecone-database/pinecone";

// ============================================================================
// Types and Interfaces
// ============================================================================

/** Vector representation for embedding storage */
export interface Vector {
  id: string;
  values: number[];
  metadata?: RecordMetadata;
}

/** Query result from vector search */
export interface QueryResult {
  id: string;
  score: number;
  metadata?: RecordMetadata;
  values?: number[];
}

/** RAG result combining retrieved context with generated response */
export interface RAGResult {
  query: string;
  retrievedContexts: RetrievedContext[];
  synthesizedResponse: string;
  confidence: number;
}

/** Context retrieved from knowledge base */
export interface RetrievedContext {
  source: "ephemeral" | "persistent" | "reflective";
  content: unknown;
  relevanceScore: number;
  metadata?: RecordMetadata;
}

/** Pattern for reflective knowledge tier */
export interface Pattern {
  id: string;
  type: "command_sequence" | "error_recovery" | "workflow" | "heuristic";
  signature: string | RegExp;
  description: string;
  context: string;
  confidence: number;
  usageCount: number;
  createdAt: Date;
  lastUsedAt: Date;
  successRate?: number;
  metadata?: Record<string, unknown>;
}

/** Ephemeral storage entry with TTL */
interface EphemeralEntry {
  value: unknown;
  expiresAt: number | null; // timestamp in ms, null = no expiry
}

/** Configuration for KnowledgeBase */
export interface KnowledgeBaseConfig {
  pineconeApiKey?: string;
  pineconeEnvironment?: string;
  pineconeHost?: string;
  defaultTopK?: number;
  embeddingDimension?: number;
}

/** Vector index names in Pinecone */
export const VectorIndices = {
  COMMANDS: "commands-index",
  ERRORS: "errors-index",
  WORKFLOWS: "workflows-index",
} as const;

/** Command vector metadata schema */
export interface CommandMetadata extends RecordMetadata {
  tool: "innovus" | "genus" | "tempus" | "icc2" | "openroad" | string;
  category: "floorplan" | "placement" | "routing" | "timing" | "physical" | string;
  description: string;
  command: string;
  success_rate: number;
  usage_count: number;
  tags: string[];
}

/** Error pattern vector metadata schema */
export interface ErrorMetadata extends RecordMetadata {
  error_type: string;
  tool: string;
  symptom_pattern: string;
  root_cause: string;
  solution_commands: string[];
  recovery_strategy: string;
  frequency: number;
}

/** Workflow vector metadata schema */
export interface WorkflowMetadata extends RecordMetadata {
  name: string;
  description: string;
  task_type: string;
  command_sequence: string[];
  estimated_duration: number;
  success_rate: number;
  prerequisites: string[];
  outputs: string[];
}

// ============================================================================
// KnowledgeBase Class
// ============================================================================

/**
 * Three-tier knowledge management system with Pinecone vector DB integration.
 *
 * Architecture:
 * - Tier 1 (Ephemeral): In-memory session-scoped storage with TTL
 * - Tier 2 (Persistent): Pinecone vector DB for semantic search
 * - Tier 3 (Reflective): Learned patterns and domain heuristics
 *
 * The KnowledgeBase acts as a cognitive prosthetic, compensating for the LLM's
 * lack of EDA-specific training through RAG-based expertise injection.
 */
export class KnowledgeBase {
  private pinecone: Pinecone | null = null;
  private ephemeralStore: Map<string, EphemeralEntry> = new Map();
  private reflectiveStore: Map<string, Pattern> = new Map();
  private config: KnowledgeBaseConfig;
  private indexCache: Map<string, Index> = new Map();

  // Cleanup interval for ephemeral store
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: KnowledgeBaseConfig = {}) {
    this.config = {
      defaultTopK: 5,
      embeddingDimension: 1536,
      ...config,
    };

    this.initializePinecone();
    this.startCleanupInterval();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializePinecone(): void {
    const apiKey = this.config.pineconeApiKey || process.env.PINECONE_API_KEY;

    if (!apiKey) {
      console.warn(
        "[KnowledgeBase] Pinecone API key not provided. Persistent storage will be unavailable."
      );
      return;
    }

    try {
      this.pinecone = new Pinecone({ apiKey });
      console.log("[KnowledgeBase] Pinecone client initialized");
    } catch (error) {
      console.error("[KnowledgeBase] Failed to initialize Pinecone:", error);
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired ephemeral entries every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupEphemeral();
    }, 60000);
  }

  /**
   * Dispose of resources and stop background tasks
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // ============================================================================
  // Tier 1: Ephemeral Storage (In-Memory)
  // ============================================================================

  /**
   * Store a value in ephemeral memory with optional TTL.
   * @param key - Unique identifier
   * @param value - Value to store
   * @param ttlMs - Time-to-live in milliseconds (undefined = no expiry)
   */
  storeEphemeral(key: string, value: unknown, ttlMs?: number): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.ephemeralStore.set(key, { value, expiresAt });
  }

  /**
   * Retrieve a value from ephemeral memory.
   * @param key - Unique identifier
   * @returns The stored value or undefined if not found/expired
   */
  queryEphemeral<T = unknown>(key: string): T | undefined {
    const entry = this.ephemeralStore.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.ephemeralStore.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Delete a specific ephemeral entry.
   */
  deleteEphemeral(key: string): boolean {
    return this.ephemeralStore.delete(key);
  }

  /**
   * Clear all ephemeral entries.
   */
  clearEphemeral(): void {
    this.ephemeralStore.clear();
  }

  /**
   * Get all ephemeral keys (for debugging).
   */
  getEphemeralKeys(): string[] {
    return Array.from(this.ephemeralStore.keys());
  }

  private cleanupEphemeral(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.ephemeralStore.entries())) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.ephemeralStore.delete(key);
      }
    }
  }

  // ============================================================================
  // Tier 2: Persistent Storage (Pinecone Vector DB)
  // ============================================================================

  /**
   * Get or create a cached index reference.
   */
  private async getIndex(indexName: string): Promise<Index | null> {
    if (!this.pinecone) {
      throw new Error("Pinecone not initialized. Check PINECONE_API_KEY.");
    }

    if (this.indexCache.has(indexName)) {
      return this.indexCache.get(indexName)!;
    }

    try {
      const index = this.pinecone.index(indexName);
      this.indexCache.set(indexName, index);
      return index;
    } catch (error) {
      console.error(`[KnowledgeBase] Failed to get index ${indexName}:`, error);
      return null;
    }
  }

  /**
   * Store vectors in a Pinecone index.
   * @param indexName - Name of the Pinecone index
   * @param vectors - Array of vectors to store
   */
  async storePersistent(indexName: string, vectors: Vector[]): Promise<void> {
    const index = await this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index '${indexName}' not available`);
    }

    try {
      // Pinecone v5 expects records in a specific format
      const records = vectors.map((v) => ({
        id: v.id,
        values: v.values,
        metadata: v.metadata || {},
      }));

      await index.upsert(records);
      console.log(`[KnowledgeBase] Stored ${vectors.length} vectors in ${indexName}`);
    } catch (error) {
      console.error(`[KnowledgeBase] Failed to store vectors in ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Query a Pinecone index with a vector embedding.
   * @param indexName - Name of the Pinecone index
   * @param queryVector - The query embedding vector
   * @param topK - Number of results to return
   * @param filter - Optional metadata filter
   */
  async queryPersistentByVector(
    indexName: string,
    queryVector: number[],
    topK?: number,
    filter?: Record<string, unknown>
  ): Promise<QueryResult[]> {
    const index = await this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index '${indexName}' not available`);
    }

    const k = topK || this.config.defaultTopK || 5;

    try {
      const response = await index.query({
        vector: queryVector,
        topK: k,
        includeMetadata: true,
        includeValues: false,
        filter: filter as RecordMetadata,
      });

      return (
        response.matches?.map((match) => ({
          id: match.id,
          score: match.score || 0,
          metadata: match.metadata,
        })) || []
      );
    } catch (error) {
      console.error(`[KnowledgeBase] Query failed for ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Query a Pinecone index with a text query (converts to embedding).
   * @param indexName - Name of the Pinecone index
   * @param query - Text query to search for
   * @param topK - Number of results to return
   * @param filter - Optional metadata filter
   */
  async queryPersistent(
    indexName: string,
    query: string,
    topK?: number,
    filter?: Record<string, unknown>
  ): Promise<QueryResult[]> {
    // Generate embedding for the query
    const queryVector = await this.generateEmbedding(query);
    return this.queryPersistentByVector(indexName, queryVector, topK, filter);
  }

  /**
   * Delete vectors from a Pinecone index.
   */
  async deletePersistent(indexName: string, ids: string[]): Promise<void> {
    const index = await this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index '${indexName}' not available`);
    }

    try {
      await index.deleteMany(ids);
      console.log(`[KnowledgeBase] Deleted ${ids.length} vectors from ${indexName}`);
    } catch (error) {
      console.error(`[KnowledgeBase] Failed to delete vectors:`, error);
      throw error;
    }
  }

  /**
   * Fetch a specific vector by ID.
   */
  async fetchPersistent(indexName: string, id: string): Promise<QueryResult | null> {
    const index = await this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index '${indexName}' not available`);
    }

    try {
      const response = await index.fetch([id]);
      const record = response.records?.[id];

      if (!record) {
        return null;
      }

      return {
        id: record.id,
        score: 1.0, // Exact match
        metadata: record.metadata,
        values: record.values,
      };
    } catch (error) {
      console.error(`[KnowledgeBase] Failed to fetch vector:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Tier 3: Reflective Storage (Learned Patterns)
  // ============================================================================

  /**
   * Store a learned pattern in the reflective tier.
   * @param pattern - The pattern to store
   */
  async storeReflective(pattern: Pattern): Promise<void> {
    // Validate pattern
    if (!pattern.id || !pattern.type || !pattern.signature) {
      throw new Error("Pattern must have id, type, and signature");
    }

    // Update timestamps
    pattern.lastUsedAt = new Date();
    if (!pattern.createdAt) {
      pattern.createdAt = new Date();
    }

    this.reflectiveStore.set(pattern.id, pattern);
    console.log(`[KnowledgeBase] Stored reflective pattern: ${pattern.id}`);
  }

  /**
   * Query reflective patterns by context.
   * Uses simple text matching against pattern signatures and descriptions.
   * @param context - Search context (e.g., error message, command type)
   * @param patternType - Optional filter by pattern type
   * @returns Matching patterns sorted by confidence
   */
  async queryReflective(context: string, patternType?: Pattern["type"]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    for (const pattern of Array.from(this.reflectiveStore.values())) {
      // Filter by type if specified
      if (patternType && pattern.type !== patternType) {
        continue;
      }

      // Calculate relevance score
      const score = this.calculatePatternRelevance(pattern, context);

      if (score > 0) {
        patterns.push({ ...pattern, confidence: score });
      }
    }

    // Sort by confidence (descending)
    return patterns.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }

  /**
   * Find patterns matching an error signature using regex.
   * @param errorMessage - The error message to match
   */
  async findErrorPattern(errorMessage: string): Promise<Pattern | null> {
    for (const pattern of Array.from(this.reflectiveStore.values())) {
      if (pattern.type !== "error_recovery") continue;

      const signature = pattern.signature;
      if (signature instanceof RegExp) {
        if (signature.test(errorMessage)) {
          return pattern;
        }
      } else if (typeof signature === "string") {
        if (errorMessage.includes(signature)) {
          return pattern;
        }
      }
    }
    return null;
  }

  /**
   * Update pattern statistics after usage.
   */
  async updatePatternUsage(patternId: string, success: boolean): Promise<void> {
    const pattern = this.reflectiveStore.get(patternId);
    if (!pattern) return;

    pattern.usageCount = (pattern.usageCount || 0) + 1;
    pattern.lastUsedAt = new Date();

    // Update success rate using running average
    if (pattern.successRate === undefined) {
      pattern.successRate = success ? 1 : 0;
    } else {
      const n = pattern.usageCount;
      pattern.successRate = (pattern.successRate * (n - 1) + (success ? 1 : 0)) / n;
    }

    this.reflectiveStore.set(patternId, pattern);
  }

  /**
   * Get all reflective patterns (for debugging/analysis).
   */
  getAllReflectivePatterns(): Pattern[] {
    return Array.from(this.reflectiveStore.values());
  }

  /**
   * Delete a reflective pattern.
   */
  deleteReflective(patternId: string): boolean {
    return this.reflectiveStore.delete(patternId);
  }

  private calculatePatternRelevance(pattern: Pattern, context: string): number {
    const contextLower = context.toLowerCase();
    const descriptionLower = pattern.description?.toLowerCase() || "";
    const signatureStr = pattern.signature?.toString().toLowerCase() || "";

    let score = 0;

    // Exact match in description
    if (descriptionLower.includes(contextLower)) {
      score += 0.5;
    }

    // Word overlap
    const contextWords = new Set(contextLower.split(/\s+/));
    const descWords = descriptionLower.split(/\s+/);
    const matches = descWords.filter((w) => contextWords.has(w)).length;
    score += (matches / Math.max(contextWords.size, 1)) * 0.3;

    // Signature match
    if (signatureStr.includes(contextLower)) {
      score += 0.2;
    }

    // Boost by base confidence and usage
    score += (pattern.confidence || 0.5) * 0.3;
    score += Math.min((pattern.usageCount || 0) / 100, 0.1); // Max 0.1 boost

    return Math.min(score, 1.0);
  }

  // ============================================================================
  // RAG: Retrieve and Generate
  // ============================================================================

  /**
   * Full RAG pipeline: retrieve relevant context and synthesize response.
   * @param query - User query
   * @param context - Optional additional context
   * @returns RAG result with retrieved contexts and synthesized response
   */
  async retrieveAndGenerate(query: string, context?: string): Promise<RAGResult> {
    const retrievedContexts: RetrievedContext[] = [];

    // 1. Query ephemeral tier (fastest)
    const ephemeralKey = this.findEphemeralKey(query);
    if (ephemeralKey) {
      const ephemeralValue = this.queryEphemeral(ephemeralKey);
      if (ephemeralValue) {
        retrievedContexts.push({
          source: "ephemeral",
          content: ephemeralValue,
          relevanceScore: 0.9,
          metadata: { key: ephemeralKey },
        });
      }
    }

    // 2. Query persistent tier (vector search)
    try {
      // Search across all indices
      const [commandResults, errorResults, workflowResults] = await Promise.all([
        this.queryPersistent(VectorIndices.COMMANDS, query, 3).catch(() => []),
        this.queryPersistent(VectorIndices.ERRORS, query, 2).catch(() => []),
        this.queryPersistent(VectorIndices.WORKFLOWS, query, 2).catch(() => []),
      ]);

      for (const result of commandResults) {
        retrievedContexts.push({
          source: "persistent",
          content: result.metadata,
          relevanceScore: result.score,
          metadata: { index: VectorIndices.COMMANDS, id: result.id },
        });
      }

      for (const result of errorResults) {
        retrievedContexts.push({
          source: "persistent",
          content: result.metadata,
          relevanceScore: result.score,
          metadata: { index: VectorIndices.ERRORS, id: result.id },
        });
      }

      for (const result of workflowResults) {
        retrievedContexts.push({
          source: "persistent",
          content: result.metadata,
          relevanceScore: result.score,
          metadata: { index: VectorIndices.WORKFLOWS, id: result.id },
        });
      }
    } catch (error) {
      console.warn("[KnowledgeBase] Persistent query failed:", error);
    }

    // 3. Query reflective tier (learned patterns)
    const patterns = await this.queryReflective(query);
    for (const pattern of patterns.slice(0, 3)) {
      retrievedContexts.push({
        source: "reflective",
        content: pattern,
        relevanceScore: pattern.confidence,
        metadata: { patternId: pattern.id, type: pattern.type },
      });
    }

    // 4. Synthesize response from retrieved contexts
    const synthesizedResponse = this.synthesizeResponse(query, retrievedContexts, context);

    // Calculate overall confidence
    const confidence =
      retrievedContexts.length > 0
        ? retrievedContexts.reduce((sum, ctx) => sum + ctx.relevanceScore, 0) /
          retrievedContexts.length
        : 0;

    return {
      query,
      retrievedContexts,
      synthesizedResponse,
      confidence: Math.min(confidence, 1.0),
    };
  }

  private findEphemeralKey(query: string): string | null {
    // Simple keyword matching for ephemeral lookup
    const queryLower = query.toLowerCase();
    for (const key of Array.from(this.ephemeralStore.keys())) {
      if (queryLower.includes(key.toLowerCase())) {
        return key;
      }
    }
    return null;
  }

  private synthesizeResponse(
    query: string,
    contexts: RetrievedContext[],
    additionalContext?: string
  ): string {
    // Build context sections
    const commandContexts = contexts.filter(
      (c) => c.metadata?.index === VectorIndices.COMMANDS || c.metadata?.category
    );
    const errorContexts = contexts.filter(
      (c) => c.metadata?.index === VectorIndices.ERRORS || c.metadata?.error_type
    );
    const workflowContexts = contexts.filter(
      (c) => c.metadata?.index === VectorIndices.WORKFLOWS || c.metadata?.task_type
    );
    const patternContexts = contexts.filter((c) => c.source === "reflective");

    let response = `Based on my knowledge base, here's what I found for "${query}":\n\n`;

    // Add command suggestions
    if (commandContexts.length > 0) {
      response += "**Relevant Commands:**\n";
      for (const ctx of commandContexts.slice(0, 3)) {
        const meta = ctx.content as CommandMetadata;
        if (meta?.command) {
          response += `- \`${meta.command}\` (${meta.tool}): ${meta.description}\n`;
        }
      }
      response += "\n";
    }

    // Add error patterns
    if (errorContexts.length > 0) {
      response += "**Related Error Patterns:**\n";
      for (const ctx of errorContexts.slice(0, 2)) {
        const meta = ctx.content as ErrorMetadata;
        if (meta?.symptom_pattern) {
          response += `- ${meta.symptom_pattern} → ${meta.recovery_strategy}\n`;
        }
      }
      response += "\n";
    }

    // Add workflow templates
    if (workflowContexts.length > 0) {
      response += "**Suggested Workflow:**\n";
      const wf = workflowContexts[0].content as WorkflowMetadata;
      if (wf?.name) {
        response += `- ${wf.name}: ${wf.description}\n`;
        if (wf.command_sequence?.length) {
          response += `- Steps: ${wf.command_sequence.join(" → ")}\n`;
        }
      }
      response += "\n";
    }

    // Add learned patterns
    if (patternContexts.length > 0) {
      response += "**Learned Patterns:**\n";
      for (const ctx of patternContexts.slice(0, 2)) {
        const pattern = ctx.content as Pattern;
        response += `- ${pattern.description} (confidence: ${(pattern.confidence * 100).toFixed(0)}%)\n`;
      }
      response += "\n";
    }

    if (additionalContext) {
      response += `**Context:** ${additionalContext}\n\n`;
    }

    if (contexts.length === 0) {
      response +=
        "No specific knowledge found for this query. Would you like me to search external documentation?\n";
    }

    return response.trim();
  }

  // ============================================================================
  // Embedding Generation (Placeholder - Replace with real embeddings)
  // ============================================================================

  /**
   * Generate an embedding vector for text.
   * NOTE: This is a placeholder implementation using a simple hash-based approach.
   * Replace with real embeddings (OpenAI, Cohere, or local model) for production.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const dimension = this.config.embeddingDimension || 1536;

    // Placeholder: Use a simple hash-based embedding
    // In production, replace with:
    // - OpenAI: openai.embeddings.create({ input: text, model: "text-embedding-3-small" })
    // - Cohere: cohere.embed({ texts: [text], model: "embed-english-v3.0" })
    // - Local: transformers.js or similar

    const embedding: number[] = new Array(dimension).fill(0);

    // Simple hash-based distribution
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      embedding[i % dimension] += charCode / 255;
      embedding[(i + 1) % dimension] += (charCode * 31) / 255;
      embedding[(i + 2) % dimension] += (charCode * 97) / 255;
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimension; i++) {
        embedding[i] = embedding[i] / magnitude;
      }
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.generateEmbedding(text)));
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if Pinecone is available and initialized.
   */
  isPersistentAvailable(): boolean {
    return this.pinecone !== null;
  }

  /**
   * Get statistics about the knowledge base.
   */
  getStats(): {
    ephemeralCount: number;
    reflectiveCount: number;
    persistentAvailable: boolean;
  } {
    return {
      ephemeralCount: this.ephemeralStore.size,
      reflectiveCount: this.reflectiveStore.size,
      persistentAvailable: this.pinecone !== null,
    };
  }

  /**
   * Clear all knowledge tiers.
   */
  async clearAll(): Promise<void> {
    this.ephemeralStore.clear();
    this.reflectiveStore.clear();

    // Note: Persistent tier (Pinecone) is not cleared by default
    // Use deletePersistent() for specific deletions
  }
}

export default KnowledgeBase;
