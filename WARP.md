# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

# Robotics Tournament Management System - Frontend

A comprehensive web application for managing robotics competitions and tournaments, built with Next.js and featuring real-time updates, role-based access control, and a sophisticated tournament management system.

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Architecture](#system-architecture)
3. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
4. [Tournament Management System](#tournament-management-system)
5. [Real-Time WebSocket Features](#real-time-websocket-features)
6. [Key Development Patterns](#key-development-patterns)
7. [API Integration](#api-integration)
8. [Testing Strategy](#testing-strategy)
9. [Troubleshooting](#troubleshooting)

## Quick Start

### Installation
```bash
# Using npm
npm install

# Using yarn  
yarn install

# Using pnpm (recommended)
pnpm install
```

### Development Commands
```bash
# Start development server with turbopack
npm run dev
# or
yarn dev
# or  
pnpm dev

# Build for production
npm run build

# Start production server
npm run start

# Run tests
npm test

# Run tests in watch mode  
npm run test:watch

# Run linting
npm run lint
```

### Environment Setup
Copy `.env.example` to `.env.local` and configure:
```bash
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
NEXT_PUBLIC_API_URL="http://localhost:5000/api" 
NEXT_PUBLIC_WS_URL="http://localhost:5000"
JWT_SECRET="your-jwt-secret-here"
PORT=3000
```

## System Architecture

### Frontend Technology Stack

- **Framework**: Next.js 15.3.1 with App Router
- **Runtime**: React 18.3.1
- **Language**: TypeScript 5 (strict mode enabled)
- **Build Tool**: Turbopack (Next.js integrated)
- **Package Manager**: pnpm (recommended), npm, or yarn supported

### State Management Architecture

- **Global State**: React Query (@tanstack/react-query) for server state
- **Component State**: React Context for authentication and match management
- **Form State**: react-hook-form with zod validation
- **Real-time State**: Custom WebSocket hooks with state synchronization

### UI and Styling

- **Design System**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables
- **Animations**: Framer Motion for advanced animations
- **Icons**: Lucide React
- **Theme**: next-themes for dark/light mode support

### Project Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/            # Authentication routes
│   ├── audience-display/  # Real-time display for audiences
│   ├── control-match/     # Match control interface
│   └── ...               # Other route groups
├── components/            # Reusable UI components
│   ├── ui/               # Base Shadcn/ui components
│   ├── features/         # Feature-specific components
│   ├── forms/            # Form components
│   ├── layout/           # Navigation and layout components
│   └── dialogs/          # Modal and dialog components
├── config/               # Configuration files
│   ├── rbac.ts           # Role-based access control config
│   └── permissions.ts    # Permission definitions
├── hooks/                # Custom React hooks organized by feature
│   ├── api/              # Data fetching hooks
│   ├── common/           # Shared utility hooks
│   └── websocket/        # Real-time WebSocket hooks
├── lib/                  # Utilities and services
│   ├── api-client.ts     # HTTP client configuration
│   ├── unified-websocket.ts # WebSocket service
│   └── utils.ts          # Utility functions
├── services/             # Business logic and API services
├── types/                # TypeScript type definitions
└── utils/                # Helper functions
```

## Role-Based Access Control (RBAC)

### User Roles Hierarchy

1. **ADMIN** - Full system access and control
2. **HEAD_REFEREE** - Tournament and match oversight
3. **ALLIANCE_REFEREE** - Match scoring and officiating
4. **TEAM_LEADER** - Team management capabilities
5. **TEAM_MEMBER** - Limited team-related access
6. **COMMON** - Public/viewer access

### Timer Control Restrictions

**IMPORTANT**: Timer control is restricted to ADMIN and HEAD_REFEREE roles only for security and match integrity:

- **ADMIN**: Full timer control (start, pause, reset, duration changes)
- **HEAD_REFEREE**: Full timer control (start, pause, reset, duration changes)
- **ALLIANCE_REFEREE**: No timer control access (scoring only)
- **Other Roles**: No timer control access

The system implements multiple layers of validation:
1. Client-side UI disabling based on role permissions
2. Hook-level RBAC validation with user-friendly error messages
3. WebSocket service permission checks
4. Server-side validation (when implemented)

### Permission System Architecture

The system uses a feature-based permission model defined in `src/config/permissions.ts`:

```typescript
// Example permission check
import { PermissionService } from '@/config/permissions';
import { UserRole } from '@/types/types';

// Check if user can access live scoring
const canScore = PermissionService.hasPermission(
  UserRole.ALLIANCE_REFEREE,
  'LIVE_SCORING',
  'ENTER_SCORES'
);
```

### Route Protection

Routes are protected via middleware (`src/middleware.ts`) using:
- **Enhanced route protector** with feature-based permissions
- **JWT verification** using the jose library
- **Development/production mode handling**
- **Comprehensive security logging**

Protected route examples:
```typescript
// Admin-only routes
"/admin" → requires SYSTEM_SETTINGS.FULL_CONTROL
"/users" → requires USER_MANAGEMENT.FULL_CONTROL

// Referee routes  
"/control-match" → requires ADMIN, HEAD_REFEREE, or ALLIANCE_REFEREE
"/referee-panel" → requires LIVE_SCORING.ENTER_AND_APPROVE

// Team management
"/team-management" → requires TEAM_MANAGEMENT.CREATE_OWN (with ownership)
```

### Component-Level RBAC

Components implement granular permission checks:

```typescript
// Timer control with enhanced RBAC
const { hasTimerPermission, canControlTimer } = useTimerControl({
  userRole: roleAccess.currentRole,
  // ... other props
});

// Conditional rendering based on permissions
{roleAccess.showTimerControls ? (
  <TimerControlPanel 
    disabled={!hasTimerPermission} 
    // ... other props
  />
) : (
  <AccessDenied 
    feature="Timer Control"
    requiredRoles={[UserRole.ADMIN, UserRole.HEAD_REFEREE]}
  />
)}
```

## Tournament Management System

### Core Tournament Features

#### Tournament Lifecycle
1. **Creation**: Tournament setup with dates, fields, and configuration
2. **Team Registration**: Team signup and management
3. **Stage Management**: Swiss rounds, playoffs, and finals
4. **Match Scheduling**: Automated and manual match creation
5. **Live Scoring**: Real-time score entry and validation
6. **Rankings**: Live leaderboards and statistics

#### Stage Types
- **SWISS**: Qualification rounds with Swiss-system pairing
- **PLAYOFF**: Elimination brackets
- **FINAL**: Championship matches

#### Match Control System
Real-time match management with:
- Timer control (start/pause/reset)
- Score entry and validation
- Match state management (PENDING → IN_PROGRESS → COMPLETED)
- Live audience display synchronization

### API Endpoint Patterns

**Important**: Use correct API endpoints as documented in README.md:

✅ **Correct Endpoints**:
- `GET /api/stages?tournamentId={id}` - Get stages by tournament
- `GET /api/tournaments/{id}/details` - Get tournament details  
- `GET /api/tournaments/{id}/fields` - Get tournament fields

❌ **Avoid These**:
- `GET /api/tournaments/{id}/stages` - This endpoint does not exist

## Real-Time WebSocket Features

### WebSocket Architecture

The system uses a unified WebSocket service (`src/lib/unified-websocket.ts`) for:

#### Core Event Types
- **match_update**: Match data and team assignments
- **score_update**: Real-time scoring updates
- **scoreUpdateRealtime**: Live score synchronization
- **timer_update**: Match timer state changes
- **display_mode_change**: Audience display control
- **ranking_update**: Live leaderboard updates

#### Connection Management
```typescript
import { useUnifiedWebSocket } from '@/hooks/websocket/use-unified-websocket';

const {
  isConnected,
  joinTournament,
  sendScoreUpdate,
  on: subscribe
} = useUnifiedWebSocket({
  tournamentId: 'tournament-id',
  autoConnect: true,
  userRole: UserRole.ALLIANCE_REFEREE
});

// Subscribe to score updates
subscribe('scoreUpdateRealtime', (scoreData) => {
  console.log('Real-time score update:', scoreData);
});
```

#### Audience Display System
Real-time synchronization for public displays:
- Live match scores and timers
- Team information and rankings
- Announcements and custom messages
- Multi-field tournament support

### State Synchronization

Advanced collaborative features:
- **Conflict Resolution**: Handle multiple users editing simultaneously
- **State Consistency**: Ensure data consistency across all clients  
- **Debounced Updates**: Optimize network traffic for high-frequency events
- **Fallback Mechanisms**: Graceful degradation when WebSocket unavailable

## Key Development Patterns

### Component Organization

```typescript
// Feature-based component structure
src/components/
├── features/
│   ├── auth/              # Authentication components
│   ├── tournaments/       # Tournament-specific UI
│   ├── matches/           # Match management UI
│   └── teams/             # Team management UI
├── ui/                    # Base design system components
└── layout/                # Navigation and layout
```

### Custom Hooks Pattern

```typescript
// Data fetching hook example
export function useTournament(tournamentId: string) {
  return useQuery({
    queryKey: ['tournaments', tournamentId],
    queryFn: () => tournamentService.getTournamentDetails(tournamentId),
    enabled: !!tournamentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Real-time hook with WebSocket
export function useRealtimeScores(matchId: string) {
  const [scores, setScores] = useState(null);
  
  useUnifiedWebSocket({
    onScoreUpdate: setScores,
    matchId,
    autoConnect: true,
  });
  
  return { scores, isConnected };
}
```

### Type Safety Patterns

```typescript
// Strict TypeScript usage throughout
import { z } from 'zod';

// Schema-first validation
const createTournamentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  maxTeams: z.number().positive().optional(),
});

type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
```

### Error Handling Strategy

```typescript
// Comprehensive error boundaries and handling
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>
) {
  return function WrappedComponent(props: T) {
    return (
      <ErrorBoundary 
        fallback={<ErrorFallback />}
        onError={(error, errorInfo) => {
          // Log to monitoring service
          console.error('Component Error:', error, errorInfo);
        }}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
```

## API Integration

### HTTP Client Configuration

The API client (`src/lib/api-client.ts`) provides:
- Automatic JWT token attachment
- Request/response interceptors
- Error handling and logging
- CORS support for development

```typescript
import { apiClient } from '@/lib/api-client';

// Usage examples
const tournaments = await apiClient.get('/tournaments');
const newTeam = await apiClient.post('/teams', teamData);
const exportData = await apiClient.getBlob('/export/teams');
```

### Authentication Flow

1. **Login**: POST to `/auth/login` with credentials
2. **Token Storage**: JWT stored in httpOnly cookie (secure)
3. **Auto-refresh**: Token validation on each protected request
4. **Logout**: Clear tokens and redirect to login

### React Query Integration

```typescript
// Query key patterns for consistency
export const queryKeys = {
  tournaments: ['tournaments'] as const,
  tournament: (id: string) => ['tournaments', id] as const,
  teams: (tournamentId: string) => ['teams', tournamentId] as const,
  matches: (tournamentId: string) => ['matches', tournamentId] as const,
};
```

## Testing Strategy

### Test Structure
```bash
# Test files use Jest with jsdom
__tests__/             # Unit tests
**/*.test.tsx         # Component tests  
**/*.test.ts          # Utility function tests
jest.config.js        # Jest configuration
jest.setup.js         # Test setup and mocks
```

### Test Patterns
```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
}
```

## Troubleshooting

### Common Development Issues

#### CORS Errors
```typescript
// Ensure backend CORS is configured for development
// API client includes credentials: 'include' for cookie support
```

#### JWT Token Issues
```typescript
// Check browser cookies for 'token' (not 'auth_token')
// Verify JWT_SECRET matches backend configuration
// Check token expiration and refresh logic
```

#### WebSocket Connection Problems
```typescript
// Verify NEXT_PUBLIC_WS_URL environment variable
// Check WebSocket server is running
// Monitor browser console for connection errors
// Use window.audienceDisplayWS for debugging in development
```

#### Build Errors
```typescript
// Clear Next.js cache: rm -rf .next
// Clear node_modules: rm -rf node_modules && npm install
// Check TypeScript errors: npx tsc --noEmit
```

### Performance Optimization

#### React Query Caching
- Configured with 1-minute stale time
- Background refetch enabled
- Query invalidation on mutations

#### WebSocket Debouncing
- High-frequency events (scores, timer) are debounced
- Configurable debounce delays per event type
- Automatic batching for related updates

#### Bundle Optimization
- Turbopack for fast development builds
- Code splitting at route level
- Lazy loading for heavy components

### Debugging Tools

#### Development Helpers
```typescript
// WebSocket debugging interface (development only)
window.audienceDisplayWS.changeDisplayMode({ displayMode: 'match' });
window.audienceDisplayWS.sendScoreUpdate({ matchId: '123', redScore: 50 });

// React Query DevTools available in development
// Comprehensive logging in browser console
```

### Environment-Specific Behavior

#### Development
- Enhanced logging and debugging
- WebSocket connection retry with detailed logs
- Mock data support via MOCK_DATA environment variable
- Authentication bypass available via BYPASS_AUTH

#### Production
- Minimal logging for performance
- Optimized WebSocket reconnection
- Secure cookie handling
- HTTPS enforcement for security features

---

**Note**: This application requires a compatible backend API server. Ensure the backend is running and properly configured before starting frontend development.
