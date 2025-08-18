export interface DebounceConfig {
  delay?: number; // wait time before executing handler
  maxCalls?: number; // max executions within windowMs
  windowMs?: number; // rolling window for rate limiting
}

/**
 * Simple key-based debounce + basic rate-limit manager.
 * - Subsequent calls with the same key within `delay` reset the timer.
 * - If maxCalls/windowMs provided, execution is skipped when limit exceeded.
 */
export class DebounceManager<TData = any> {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private counters = new Map<string, { count: number; windowStart: number }>();

  private withinRateLimit(key: string, cfg: DebounceConfig): boolean {
    const now = Date.now();
    const windowMs = cfg.windowMs ?? 0;
    const maxCalls = cfg.maxCalls ?? 0;

    if (!windowMs || !maxCalls) return true; // no rate limit configured

    const entry = this.counters.get(key);
    if (!entry) {
      this.counters.set(key, { count: 1, windowStart: now });
      return true;
    }

    // reset window if elapsed
    if (now - entry.windowStart >= windowMs) {
      entry.count = 1;
      entry.windowStart = now;
      this.counters.set(key, entry);
      return true;
    }

    if (entry.count < maxCalls) {
      entry.count += 1;
      this.counters.set(key, entry);
      return true;
    }

    // over the limit
    return false;
  }

  /**
   * Debounce a keyed handler. Only the last call within `delay` executes.
   * If rate limit (maxCalls/windowMs) is exceeded at execution time, the call is skipped.
   */
  debounce(
    key: string,
    handler: (data: TData) => void | Promise<void>,
    data: TData,
    config: DebounceConfig = {}
  ) {
    const delay = config.delay ?? 200;

    // Clear previous timer for the key
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      // Basic rate limit check at execution time
      if (!this.withinRateLimit(key, config)) {
        return; // silently drop if over limit
      }
      try {
        await handler(data);
      } finally {
        this.timers.delete(key);
      }
    }, delay);

    this.timers.set(key, timer);
  }

  /** Cancel a pending debounce by key */
  cancel(key: string) {
    const t = this.timers.get(key);
    if (t) {
      clearTimeout(t);
      this.timers.delete(key);
    }
  }

  /** Clear all pending timers and counters */
  clearAll() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.counters.clear();
  }
}
