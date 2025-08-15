# WebSocket Memory Management Implementation

## Overview

This document describes the comprehensive memory management improvements implemented for the WebSocket system to prevent memory leaks, manage resource usage, and ensure optimal performance.

## Key Components

### 1. Bounded Collections (`memory-management.ts`)

#### BoundedMap<K, V>
- **Purpose**: Map with automatic size limits and age-based cleanup
- **Features**:
  - LRU (Least Recently Used) eviction when size limit exceeded
  - Age-based expiration of entries
  - Automatic cleanup timers
  - Eviction callbacks for custom cleanup logic
  - Access tracking and statistics

```typescript
const boundedMap = new BoundedMap<string, MessageData>({
  maxSize: 1000,
  maxAge: 300000, // 5 minutes
  cleanupInterval: 60000, // 1 minute
  onEviction: (data) => console.log('Evicted:', data)
});
```

#### BoundedSet<T>
- **Purpose**: Set with automatic size limits and age-based cleanup
- **Features**:
  - Oldest-first eviction when size limit exceeded
  - Age-based expiration
  - Automatic cleanup timers
  - Duplicate handling

#### BoundedArray<T>
- **Purpose**: Array with automatic size management
- **Features**:
  - FIFO eviction when size limit exceeded
  - Eviction callbacks
  - Simple and efficient for message histories

### 2. Centralized Memory Manager (`memory-manager.ts`)

#### MemoryManager
- **Purpose**: Centralized coordination of cleanup across all WebSocket components
- **Features**:
  - Registration system for cleanup targets
  - Prioritized cleanup (critical, high, medium, low)
  - Memory usage monitoring
  - Automatic and manual cleanup triggers
  - Error handling and statistics
  - Aggressive cleanup mode when memory is high

```typescript
const memoryManager = getMemoryManager();
const unregister = memoryManager.registerCleanupTarget(
  createCleanupTarget(
    'MyComponent',
    () => this.cleanup(),
    { 
      priority: 'high',
      getMemoryUsage: () => this.estimateMemoryUsage()
    }
  )
);
```

### 3. Enhanced Component Cleanup

#### CrossTabCommunicator
**Improvements**:
- BoundedSet for processed messages (prevents unbounded growth)
- Enhanced close() method with comprehensive cleanup
- Memory manager integration
- LocalStorage fallback cleanup
- Destruction state tracking

**Before**: Unbounded Set for processed messages, basic cleanup
**After**: Bounded collections, comprehensive cleanup, memory monitoring

#### CrossTabSynchronizer
**Improvements**:
- BoundedMap for message buffers
- BoundedArray for message history
- Enhanced stop() method with complete resource cleanup
- Memory manager integration
- Automatic cleanup of stale data

**Before**: Unbounded arrays and maps, basic cleanup timers
**After**: Bounded collections, comprehensive cleanup, memory monitoring

#### WebSocketManager
**Improvements**:
- Memory manager integration
- Enhanced disconnect() method
- Subscription cleanup
- Callback cleanup
- Singleton instance cleanup

**Before**: Basic cleanup, potential callback leaks
**After**: Comprehensive cleanup, memory monitoring, leak prevention

## Memory Management Strategies

### 1. Bounded Data Structures
- Replace unbounded collections with bounded equivalents
- Automatic eviction based on size and age
- Configurable limits and cleanup intervals

### 2. Centralized Cleanup Coordination
- Single MemoryManager coordinates all cleanup
- Priority-based cleanup execution
- Memory pressure detection and response

### 3. Lifecycle Management
- Proper initialization and destruction patterns
- State tracking to prevent double cleanup
- Resource cleanup on component destruction

### 4. Automatic Cleanup Routines
- Periodic cleanup timers
- Age-based data expiration
- Stale reference detection and removal

## Configuration Options

### BoundedCollectionConfig
```typescript
interface BoundedCollectionConfig {
  maxSize: number;           // Maximum number of items
  maxAge?: number;           // Maximum age in milliseconds
  cleanupInterval?: number;  // Cleanup timer interval
  onEviction?: (item: any) => void; // Eviction callback
}
```

### MemoryManagerConfig
```typescript
interface MemoryManagerConfig {
  cleanupInterval: number;    // Cleanup cycle interval
  memoryThreshold: number;    // Memory pressure threshold (%)
  enableMonitoring: boolean;  // Enable memory monitoring
  enableAggressive: boolean;  // Enable aggressive cleanup
  debug: boolean;            // Enable debug logging
}
```

## Usage Examples

### Basic Setup
```typescript
// Initialize memory manager
const memoryManager = getMemoryManager();
memoryManager.start();

// Create bounded collections
const messageBuffer = new BoundedMap<string, Message[]>({
  maxSize: 50,
  maxAge: 300000,
  cleanupInterval: 60000
});

// Register for cleanup
const unregister = memoryManager.registerCleanupTarget(
  createCleanupTarget('MyComponent', () => this.cleanup())
);
```

### Component Integration
```typescript
class MyWebSocketComponent {
  private cleanupUnregister: (() => void) | null = null;
  private isDestroyed = false;

  constructor() {
    this.registerForCleanup();
  }

  private registerForCleanup(): void {
    const memoryManager = getMemoryManager();
    this.cleanupUnregister = memoryManager.registerCleanupTarget(
      createCleanupTarget(
        'MyWebSocketComponent',
        () => this.performCleanup(),
        { priority: 'high' }
      )
    );
  }

  private performCleanup(): void {
    // Component-specific cleanup logic
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.cleanupUnregister) {
      this.cleanupUnregister();
      this.cleanupUnregister = null;
    }
  }
}
```

## Performance Impact

### Memory Usage Reduction
- Bounded collections prevent unbounded growth
- Automatic cleanup reduces memory pressure
- Stale reference removal prevents leaks

### CPU Impact
- Minimal overhead from cleanup timers
- Efficient LRU and age-based eviction algorithms
- Configurable cleanup intervals to balance performance

### Network Impact
- No direct network impact
- Improved stability may reduce reconnection overhead

## Monitoring and Debugging

### Memory Statistics
```typescript
const stats = memoryManager.getMemoryStats();
console.log('Cleanup targets:', stats.totalTargets);
console.log('Memory usage:', stats.memoryUsage);
console.log('Cleanup count:', stats.cleanupCount);
```

### Debug Logging
Enable debug mode for detailed cleanup logging:
```typescript
const memoryManager = getMemoryManager({
  debug: true
});
```

## Testing

Comprehensive test suite covers:
- Bounded collection behavior
- Memory manager functionality
- Component integration
- Cleanup effectiveness
- Error handling
- Performance characteristics

Run tests:
```bash
npm test -- memory-management.test.ts
```

## Best Practices

1. **Always use bounded collections** for data that can grow indefinitely
2. **Register components for cleanup** with appropriate priority
3. **Implement proper destruction patterns** with state tracking
4. **Configure appropriate limits** based on usage patterns
5. **Monitor memory usage** in production environments
6. **Test cleanup behavior** thoroughly in component tests

## Migration Guide

### Existing Components
1. Replace unbounded collections with bounded equivalents
2. Add memory manager registration
3. Enhance cleanup methods
4. Add destruction state tracking
5. Update tests to verify cleanup behavior

### Configuration
1. Set appropriate size limits based on usage
2. Configure cleanup intervals for performance balance
3. Enable monitoring in production
4. Adjust memory thresholds based on environment
