/**
 * Intelligent Ranking Cache Service
 * 
 * Implements smart caching for rankings with automatic invalidation
 * and performance optimization for high-volume concurrent requests.
 */

import { QueryClient } from '@tanstack/react-query';
import { RealTimeRanking, RankingStats } from '@/types/ranking.types';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
  lastMatchUpdate?: number;
  dependsOn: string[]; // Dependencies for invalidation
}

export interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache entries
  enableCompression: boolean;
  enableMetrics: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  totalRequests: number;
  averageResponseTime: number;
  cacheSize: number;
  hitRatio: number;
}

/**
 * Smart caching service for rankings with dependency tracking
 */
export class RankingCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private dependencyMap = new Map<string, Set<string>>(); // dependency -> cache keys
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    cacheSize: 0,
    hitRatio: 0,
  };
  private responseTimes: number[] = [];
  private config: CacheConfig;

  constructor(
    private queryClient: QueryClient,
    config: Partial<CacheConfig> = {}
  ) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      enableCompression: false, // Can be enabled for large datasets
      enableMetrics: true,
      ...config,
    };

    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), 60 * 1000); // Every minute
  }

  /**
   * Generate cache key for tournament/stage rankings
   */
  private generateCacheKey(tournamentId: string, stageId?: string, filters?: any): string {
    const base = stageId ? `rankings:stage:${stageId}` : `rankings:tournament:${tournamentId}`;
    const filterHash = filters ? `:${this.hashObject(filters)}` : '';
    return `${base}${filterHash}`;
  }

  /**
   * Generate dependency key for match updates
   */
  private generateDependencyKey(tournamentId: string, stageId?: string): string {
    return stageId ? `matches:stage:${stageId}` : `matches:tournament:${tournamentId}`;
  }

  /**
   * Get rankings from cache or fetch if not available
   */
  async getRankings(
    tournamentId: string,
    stageId?: string,
    filters?: any,
    fetchFn?: () => Promise<RealTimeRanking[]>
  ): Promise<RealTimeRanking[]> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    const cacheKey = this.generateCacheKey(tournamentId, stageId, filters);
    const dependencyKey = this.generateDependencyKey(tournamentId, stageId);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValid(cached)) {
      this.metrics.hits++;
      this.recordResponseTime(Date.now() - startTime);
      console.log(`[RankingCache] Cache HIT for key: ${cacheKey}`);
      return cached.data;
    }

    // Cache miss - fetch data
    this.metrics.misses++;
    console.log(`[RankingCache] Cache MISS for key: ${cacheKey}`);

    if (!fetchFn) {
      throw new Error('No fetch function provided for cache miss');
    }

    try {
      const data = await fetchFn();
      
      // Store in cache with dependency tracking
      this.set(cacheKey, data, {
        dependsOn: [dependencyKey],
        lastMatchUpdate: Date.now(),
      });

      this.recordResponseTime(Date.now() - startTime);
      return data;
    } catch (error) {
      console.error(`[RankingCache] Error fetching data for key ${cacheKey}:`, error);
      throw error;
    }
  }

  /**
   * Store data in cache with dependency tracking
   */
  set<T>(
    key: string, 
    data: T, 
    options: { 
      ttl?: number; 
      dependsOn?: string[];
      lastMatchUpdate?: number;
    } = {}
  ): void {
    const { ttl = this.config.defaultTTL, dependsOn = [], lastMatchUpdate } = options;

    // Enforce cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: this.generateVersion(),
      lastMatchUpdate,
      dependsOn,
    };

    this.cache.set(key, entry);

    // Update dependency mapping
    dependsOn.forEach(dep => {
      if (!this.dependencyMap.has(dep)) {
        this.dependencyMap.set(dep, new Set());
      }
      this.dependencyMap.get(dep)!.add(key);
    });

    this.updateMetrics();
    console.log(`[RankingCache] Cached data for key: ${key}, dependencies: [${dependsOn.join(', ')}]`);
  }

  /**
   * Invalidate cache entries when match results change
   */
  invalidateByMatchUpdate(tournamentId: string, stageId?: string, matchId?: string): void {
    const dependencyKey = this.generateDependencyKey(tournamentId, stageId);
    const affectedKeys = this.dependencyMap.get(dependencyKey);

    if (affectedKeys) {
      let invalidatedCount = 0;
      affectedKeys.forEach(key => {
        if (this.cache.delete(key)) {
          invalidatedCount++;
        }
      });

      this.dependencyMap.delete(dependencyKey);
      this.metrics.invalidations += invalidatedCount;

      console.log(`[RankingCache] Invalidated ${invalidatedCount} cache entries for dependency: ${dependencyKey}`);

      // Also invalidate React Query cache
      this.invalidateQueryCache(tournamentId, stageId);
    }
  }

  /**
   * Invalidate React Query cache for rankings
   */
  private invalidateQueryCache(tournamentId: string, stageId?: string): void {
    const queryKeys = [
      ['rankings', tournamentId],
      ['stage-rankings', stageId],
      ['tournament-rankings', tournamentId],
    ].filter(key => key[1]); // Remove undefined values

    queryKeys.forEach(key => {
      this.queryClient.invalidateQueries({ queryKey: key });
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheMetrics {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      hitRatio: this.metrics.totalRequests > 0 
        ? this.metrics.hits / this.metrics.totalRequests 
        : 0,
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.dependencyMap.clear();
    this.metrics.invalidations += this.metrics.cacheSize;
    this.updateMetrics();
    console.log('[RankingCache] Cache cleared');
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    return age < this.config.defaultTTL;
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[RankingCache] Evicted oldest entry: ${oldestKey}`);
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[RankingCache] Cleaned up ${cleanedCount} expired entries`);
      this.updateMetrics();
    }
  }

  /**
   * Generate version number for cache entries
   */
  private generateVersion(): number {
    return Date.now();
  }

  /**
   * Hash object for cache key generation
   */
  private hashObject(obj: any): string {
    return btoa(JSON.stringify(obj)).slice(0, 8);
  }

  /**
   * Record response time for metrics
   */
  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);
    
    // Keep only last 100 response times
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, t) => sum + t, 0) / this.responseTimes.length;
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    this.metrics.cacheSize = this.cache.size;
    this.metrics.hitRatio = this.metrics.totalRequests > 0 
      ? this.metrics.hits / this.metrics.totalRequests 
      : 0;
  }
}

// Singleton instance
export const rankingCacheService = new RankingCacheService(
  new QueryClient(), // This will be replaced with the actual query client
  {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 500,
    enableMetrics: true,
  }
);
