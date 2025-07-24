import { jest } from '@jest/globals';

// Mock window.navigator for offline/online detection
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
  },
  writable: true,
});

// Mock window.addEventListener for online/offline events
const mockEventListeners: Record<string, ((event: Event) => void)[]> = {};

window.addEventListener = jest.fn((event: string, callback: (event: Event) => void) => {
  if (!mockEventListeners[event]) {
    mockEventListeners[event] = [];
  }
  mockEventListeners[event].push(callback);
});

window.removeEventListener = jest.fn((event: string, callback: (event: Event) => void) => {
  if (mockEventListeners[event]) {
    const index = mockEventListeners[event].indexOf(callback);
    if (index > -1) {
      mockEventListeners[event].splice(index, 1);
    }
  }
});

// Helper to trigger mocked events
export const triggerMockEvent = (eventType: string) => {
  const listeners = mockEventListeners[eventType];
  if (listeners) {
    listeners.forEach(callback => callback(new Event(eventType)));
  }
};

// Mock requestAnimationFrame for client-side calculations
global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  setTimeout(callback, 0);
  return 1;
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
