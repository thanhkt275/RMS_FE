import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

// Simple throttle implementation
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  let lastExecTime = 0;

  const throttled = ((...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastExecTime >= wait) {
      lastExecTime = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastExecTime = Date.now();
        func(...args);
        timeout = null;
      }, wait - (now - lastExecTime));
    }
  }) as T & { cancel: () => void };

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return throttled;
}

/**
 * Performance optimization hook for audience display components
 * Provides memoized values, debounced functions, and efficient re-render management
 */

interface UsePerformanceOptimizedDisplayOptions {
  debounceMs?: number;
  throttleMs?: number;
  enableVirtualization?: boolean;
}

export function usePerformanceOptimizedDisplay({
  debounceMs = 300,
  throttleMs = 100,
  enableVirtualization = false
}: UsePerformanceOptimizedDisplayOptions = {}) {
  const queryClient = useQueryClient();
  const renderCountRef = useRef(0);
  const lastUpdateRef = useRef(Date.now());

  // Track render performance
  useEffect(() => {
    renderCountRef.current += 1;
    lastUpdateRef.current = Date.now();
  });

  // Memoized debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm: string, onSearch: (term: string) => void) => {
      onSearch(searchTerm);
    }, debounceMs),
    [debounceMs]
  );

  // Memoized throttled scroll handler
  const throttledScroll = useCallback(
    throttle((scrollTop: number, onScroll: (top: number) => void) => {
      onScroll(scrollTop);
    }, throttleMs),
    [throttleMs]
  );

  // Optimized data filtering with memoization
  const createMemoizedFilter = useCallback(
    <T>(filterFn: (item: T, query: string) => boolean) => {
      return useMemo(() => {
        const cache = new Map<string, T[]>();
        
        return (data: T[], query: string): T[] => {
          const cacheKey = `${JSON.stringify(data)}-${query}`;
          
          if (cache.has(cacheKey)) {
            return cache.get(cacheKey)!;
          }
          
          const filtered = data.filter(item => filterFn(item, query));
          cache.set(cacheKey, filtered);
          
          // Limit cache size to prevent memory leaks
          if (cache.size > 100) {
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) {
              cache.delete(firstKey);
            }
          }
          
          return filtered;
        };
      }, [filterFn]);
    },
    []
  );

  // Optimized sorting with memoization
  const createMemoizedSort = useCallback(
    <T>(sortFn: (a: T, b: T) => number) => {
      return useMemo(() => {
        const cache = new Map<string, T[]>();
        
        return (data: T[], sortKey: string): T[] => {
          const cacheKey = `${JSON.stringify(data)}-${sortKey}`;
          
          if (cache.has(cacheKey)) {
            return cache.get(cacheKey)!;
          }
          
          const sorted = [...data].sort(sortFn);
          cache.set(cacheKey, sorted);
          
          // Limit cache size
          if (cache.size > 50) {
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) {
              cache.delete(firstKey);
            }
          }
          
          return sorted;
        };
      }, [sortFn]);
    },
    []
  );

  // Efficient data pagination
  const createPaginatedData = useCallback(
    <T>(data: T[], page: number, pageSize: number) => {
      return useMemo(() => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return data.slice(startIndex, endIndex);
      }, [data, page, pageSize]);
    },
    []
  );

  // Virtual scrolling helper for large datasets
  const createVirtualizedList = useCallback(
    <T>(
      data: T[],
      containerHeight: number,
      itemHeight: number,
      scrollTop: number
    ) => {
      return useMemo(() => {
        if (!enableVirtualization) {
          return { visibleItems: data, startIndex: 0, endIndex: data.length - 1 };
        }

        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleCount + 1, data.length - 1);
        
        const visibleItems = data.slice(startIndex, endIndex + 1);
        
        return {
          visibleItems,
          startIndex,
          endIndex,
          totalHeight: data.length * itemHeight,
          offsetY: startIndex * itemHeight
        };
      }, [data, containerHeight, itemHeight, scrollTop]);
    },
    [enableVirtualization]
  );

  // Optimized query invalidation
  const optimizedInvalidateQueries = useCallback(
    debounce((queryKeys: string[]) => {
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    }, 1000),
    [queryClient]
  );

  // Performance monitoring
  const getPerformanceMetrics = useCallback(() => {
    return {
      renderCount: renderCountRef.current,
      lastUpdate: lastUpdateRef.current,
      timeSinceLastUpdate: Date.now() - lastUpdateRef.current
    };
  }, []);

  // Memory cleanup
  const cleanup = useCallback(() => {
    debouncedSearch.cancel();
    throttledScroll.cancel();
    optimizedInvalidateQueries.cancel();
  }, [debouncedSearch, throttledScroll, optimizedInvalidateQueries]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // Optimized functions
    debouncedSearch,
    throttledScroll,
    createMemoizedFilter,
    createMemoizedSort,
    createPaginatedData,
    createVirtualizedList,
    optimizedInvalidateQueries,
    
    // Performance monitoring
    getPerformanceMetrics,
    
    // Cleanup
    cleanup
  };
}

/**
 * Hook for optimizing WebSocket connections in audience display
 */
export function useOptimizedWebSocket() {
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<any[]>([]);

  // Throttled message handler to prevent overwhelming the UI
  const throttledMessageHandler = useCallback(
    throttle((handler: (data: any) => void, data: any) => {
      handler(data);
    }, 50), // 20 FPS max
    []
  );

  // Batched message processing
  const processBatchedMessages = useCallback(
    debounce((messages: any[], handler: (messages: any[]) => void) => {
      if (messages.length > 0) {
        handler(messages);
        messageQueueRef.current = [];
      }
    }, 100),
    []
  );

  // Connection pooling for multiple subscriptions
  const connectionPool = useMemo(() => new Map<string, WebSocket>(), []);

  // Optimized connection management
  const getOrCreateConnection = useCallback((url: string) => {
    if (connectionPool.has(url)) {
      return connectionPool.get(url)!;
    }

    const ws = new WebSocket(url);
    connectionPool.set(url, ws);
    
    ws.onclose = () => {
      connectionPool.delete(url);
    };

    return ws;
  }, [connectionPool]);

  // Cleanup connections
  const cleanupConnections = useCallback(() => {
    connectionPool.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    connectionPool.clear();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, [connectionPool]);

  useEffect(() => {
    return cleanupConnections;
  }, [cleanupConnections]);

  return {
    throttledMessageHandler,
    processBatchedMessages,
    getOrCreateConnection,
    cleanupConnections,
    connectionPool
  };
}

/**
 * Hook for optimizing data structures in audience display
 */
export function useOptimizedDataStructures<T>() {
  // Memoized data transformations
  const createIndexedData = useCallback((data: T[], keyFn: (item: T) => string) => {
    return useMemo(() => {
      const indexed = new Map<string, T>();
      const array = [...data];
      
      array.forEach(item => {
        indexed.set(keyFn(item), item);
      });
      
      return { indexed, array };
    }, [data, keyFn]);
  }, []);

  // Efficient data updates
  const createOptimizedUpdater = useCallback(() => {
    return useCallback((
      currentData: T[],
      updates: Partial<T>[],
      keyFn: (item: T) => string
    ) => {
      const dataMap = new Map(currentData.map(item => [keyFn(item), item]));
      
      updates.forEach(update => {
        const key = keyFn(update as T);
        if (dataMap.has(key)) {
          dataMap.set(key, { ...dataMap.get(key)!, ...update });
        }
      });
      
      return Array.from(dataMap.values());
    }, []);
  }, []);

  return {
    createIndexedData,
    createOptimizedUpdater
  };
}
