/**
 * Memory Management Utilities for WebSocket System
 * Provides bounded collections, cleanup utilities, and memory monitoring
 */

/**
 * Configuration for bounded collections
 */
export interface BoundedCollectionConfig {
  maxSize: number;
  maxAge?: number; // in milliseconds
  cleanupInterval?: number; // in milliseconds
  onEviction?: (item: any) => void;
}

/**
 * Entry wrapper for bounded collections with timestamp
 */
interface TimestampedEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Bounded Map with LRU eviction and age-based cleanup
 */
export class BoundedMap<K, V> extends Map<K, TimestampedEntry<V>> {
  private readonly config: Required<BoundedCollectionConfig>;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: BoundedCollectionConfig) {
    super();
    this.config = {
      maxSize: config.maxSize,
      maxAge: config.maxAge || 300000, // 5 minutes default
      cleanupInterval: config.cleanupInterval || 60000, // 1 minute default
      onEviction: config.onEviction || (() => {})
    };

    this.startCleanupTimer();
  }

  // Keep the base Map signature and add a convenience overload that accepts V
  set(key: K, value: TimestampedEntry<V>): this;
  set(key: K, value: V): this;
  set(key: K, value: any): this {
    // If caller passed a TimestampedEntry, forward to super.set directly
    if (value && typeof value === 'object' && 'value' in value && 'timestamp' in value) {
      super.set(key, value as TimestampedEntry<V>);
      // enforce size limit if needed
      if (this.size > this.config.maxSize) {
        this.evictLRU();
      }
      return this;
    }

    // Otherwise build a TimestampedEntry from the raw value
    const now = Date.now();
    const entry: TimestampedEntry<V> = {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    };

    // Remove existing entry if it exists
    if (super.has(key)) {
      const existing = super.get(key)!;
      this.config.onEviction(existing.value);
    }

    super.set(key, entry);

    // Enforce size limit
    if (this.size > this.config.maxSize) {
      this.evictLRU();
    }

    return this;
  }

  // Override Map.get to return the internal TimestampedEntry to match Map<K, TimestampedEntry<V>>
  get(key: K): TimestampedEntry<V> | undefined {
    return this.retrieveEntry(key, true);
  }

  // Convenience method to obtain the stored value (original behavior)
  getValue(key: K): V | undefined {
    const entry = this.retrieveEntry(key, true);
    return entry ? entry.value : undefined;
  }

  // Shared retrieval logic that handles expiration and optional access statistics update
  private retrieveEntry(key: K, touch = true): TimestampedEntry<V> | undefined {
    const entry = super.get(key);
    if (!entry) return undefined;

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.delete(key);
      return undefined;
    }

    if (touch) {
      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();
    }

    return entry;
  }

  delete(key: K): boolean {
    const entry = super.get(key);
    if (entry) {
      this.config.onEviction(entry.value);
    }
    return super.delete(key);
  }

  clear(): void {
    // Call onEviction for all entries
    for (const entry of super.values()) {
      this.config.onEviction(entry.value);
    }
    super.clear();
  }

  private evictLRU(): void {
    let oldestKey: K | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of super.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.delete(oldestKey);
    }
  }

  private isExpired(entry: TimestampedEntry<V>): boolean {
    return (Date.now() - entry.timestamp) > this.config.maxAge;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: K[] = [];

    for (const [key, entry] of super.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }

  getStats(): {
    size: number;
    maxSize: number;
    oldestEntry: number;
    newestEntry: number;
    totalAccesses: number;
  } {
    let oldestTime = Date.now();
    let newestTime = 0;
    let totalAccesses = 0;

    for (const entry of super.values()) {
      if (entry.timestamp < oldestTime) oldestTime = entry.timestamp;
      if (entry.timestamp > newestTime) newestTime = entry.timestamp;
      totalAccesses += entry.accessCount;
    }

    return {
      size: this.size,
      maxSize: this.config.maxSize,
      oldestEntry: oldestTime,
      newestEntry: newestTime,
      totalAccesses
    };
  }
}

/**
 * Bounded Set with age-based cleanup
 */
export class BoundedSet<T> extends Set<TimestampedEntry<T>> {
  private readonly config: Required<BoundedCollectionConfig>;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private valueToEntry = new Map<T, TimestampedEntry<T>>();

  constructor(config: BoundedCollectionConfig) {
    super();
    this.config = {
      maxSize: config.maxSize,
      maxAge: config.maxAge || 300000,
      cleanupInterval: config.cleanupInterval || 60000,
      onEviction: config.onEviction || (() => {})
    };

    this.startCleanupTimer();
  }

  // Keep Set's base signature and add a convenience overload that accepts T
  add(value: TimestampedEntry<T>): this;
  add(value: T): this;
  add(value: any): this {
    // If caller passed a TimestampedEntry, use it directly
    let entry: TimestampedEntry<T>;
    if (value && typeof value === 'object' && 'value' in value && 'timestamp' in value) {
      entry = value as TimestampedEntry<T>;
      // Remove existing entry for same raw value if present
      if (this.valueToEntry.has(entry.value)) {
        const existing = this.valueToEntry.get(entry.value)!;
        super.delete(existing);
        this.config.onEviction(existing.value);
      }
    } else {
      // Raw value provided, wrap in TimestampedEntry
      const rawValue = value as T;
      if (this.valueToEntry.has(rawValue)) {
        const existing = this.valueToEntry.get(rawValue)!;
        super.delete(existing);
        this.config.onEviction(existing.value);
      }

      entry = {
        value: rawValue,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now()
      };
    }

    super.add(entry);
    this.valueToEntry.set(entry.value, entry);

    // Enforce size limit
    if (this.size > this.config.maxSize) {
      this.evictOldest();
    }

    return this;
  }

  // Accept either a TimestampedEntry or a raw value T
  has(value: TimestampedEntry<T>): boolean;
  has(value: T): boolean;
  has(value: any): boolean {
    // If a TimestampedEntry is passed, check presence directly
    if (value && typeof value === 'object' && 'value' in value && 'timestamp' in value) {
      const entry = value as TimestampedEntry<T>;
      if (!super.has(entry)) return false;
      if (this.isExpired(entry)) {
        this.delete(entry.value);
        return false;
      }
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      return true;
    }

    const entry = this.valueToEntry.get(value as T);
    if (!entry) return false;

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(value as T);
      return false;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return true;
  }

  // Accept either a TimestampedEntry or a raw value T
  delete(value: TimestampedEntry<T>): boolean;
  delete(value: T): boolean;
  delete(value: any): boolean {
    if (value && typeof value === 'object' && 'value' in value && 'timestamp' in value) {
      const entry = value as TimestampedEntry<T>;
      this.config.onEviction(entry.value);
      this.valueToEntry.delete(entry.value);
      return super.delete(entry);
    }

    const entry = this.valueToEntry.get(value as T);
    if (!entry) return false;

    this.config.onEviction(entry.value);
    this.valueToEntry.delete(value as T);
    return super.delete(entry);
  }

  clear(): void {
    for (const entry of super.values()) {
      this.config.onEviction(entry.value);
    }
    this.valueToEntry.clear();
    super.clear();
  }

  private evictOldest(): void {
    let oldestEntry: TimestampedEntry<T> | null = null;
    let oldestTime = Date.now();

    for (const entry of super.values()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestEntry = entry;
      }
    }

    if (oldestEntry) {
      this.delete(oldestEntry.value);
    }
  }

  private isExpired(entry: TimestampedEntry<T>): boolean {
    return (Date.now() - entry.timestamp) > this.config.maxAge;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const expiredValues: T[] = [];

    for (const entry of super.values()) {
      if (this.isExpired(entry)) {
        expiredValues.push(entry.value);
      }
    }

    expiredValues.forEach(value => this.delete(value));
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

/**
 * Bounded Array with automatic size management
 */
export class BoundedArray<T> extends Array<T> {
  private readonly maxSize: number;
  private readonly onEviction?: (item: T) => void;

  constructor(maxSize: number, onEviction?: (item: T) => void) {
    super();
    this.maxSize = maxSize;
    this.onEviction = onEviction;
  }

  push(...items: T[]): number {
    const result = super.push(...items);
    this.enforceLimit();
    return result;
  }

  unshift(...items: T[]): number {
    const result = super.unshift(...items);
    this.enforceLimit();
    return result;
  }

  private enforceLimit(): void {
    while (this.length > this.maxSize) {
      const evicted = this.shift();
      if (evicted !== undefined && this.onEviction) {
        this.onEviction(evicted);
      }
    }
  }

  destroy(): void {
    if (this.onEviction) {
      this.forEach(item => this.onEviction!(item));
    }
    this.length = 0;
  }
}
