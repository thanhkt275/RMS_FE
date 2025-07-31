import { renderHook } from '@testing-library/react';
import { useRoleBasedAccess } from '../use-role-based-access';
import { useAuth } from '@/hooks/common/use-auth';
import { UserRole } from '@/types/types';

// Mock the auth hook
jest.mock('@/hooks/common/use-auth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the unified WebSocket service
jest.mock('@/services/unified-websocket/unified-websocket-service', () => ({
  unifiedWebSocketService: {
    setUserRole: jest.fn(),
    getUIAccessControl: jest.fn(() => ({
      canControlTimer: false,
      canControlMatch: false,
      canUpdateScores: false,
      canControlDisplay: false,
      canManageTournament: false,
      canManageUsers: false,
      canManageFields: false,
      showTimerControls: false,
      showMatchControls: false,
      showScoringPanel: false,
      showDisplayControls: false,
    })),
    onRoleChange: jest.fn(() => jest.fn()),
  },
}));

describe('useRoleBasedAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default access control for no user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      verifyEmail: jest.fn(),
    });

    const { result } = renderHook(() => useRoleBasedAccess());

    expect(result.current.currentRole).toBe(UserRole.COMMON);
    expect(result.current.canAccess('timer')).toBe(false);
    expect(result.current.canAccess('match')).toBe(false);
    expect(result.current.canAccess('scoring')).toBe(false);
    expect(result.current.canAccess('display')).toBe(false);
  });

  it('should provide correct access denied messages', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'testuser', role: UserRole.ALLIANCE_REFEREE, email: 'test@example.com' },
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      verifyEmail: jest.fn(),
    });

    const { result } = renderHook(() => useRoleBasedAccess());

    const timerMessage = result.current.getAccessDeniedMessage('timer');
    expect(timerMessage).toContain('Timer controls require HEAD_REFEREE or ADMIN role');
    expect(timerMessage).toContain('ALLIANCE_REFEREE');
  });

  it('should identify role types correctly', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'admin', role: UserRole.ADMIN, email: 'admin@example.com' },
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      verifyEmail: jest.fn(),
    });

    const { result } = renderHook(() => useRoleBasedAccess());

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isHeadReferee).toBe(false);
    expect(result.current.isAllianceReferee).toBe(false);
    expect(result.current.hasFullAccess).toBe(true);
    expect(result.current.hasScoringAccess).toBe(true);
  });

  it('should provide correct role-based styling', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'referee', role: UserRole.ALLIANCE_REFEREE, email: 'ref@example.com' },
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      verifyEmail: jest.fn(),
    });

    const { result } = renderHook(() => useRoleBasedAccess());

    const timerStyling = result.current.getRoleBasedStyling('timer');
    expect(timerStyling.container).toBe('opacity-50 pointer-events-none');
    expect(timerStyling.button).toBe('bg-gray-300 cursor-not-allowed');
    expect(timerStyling.text).toBe('text-muted-foreground');
  });
});