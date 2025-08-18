import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/common/use-auth';
import { UserRole } from '@/types/types';
import { useWebSocket } from '@/websockets/simplified/useWebSocket';

/**
 * Hook for managing role-based access control in the control-match page
 */
export function useRoleBasedAccess() {
  const { user } = useAuth();
  // We only need role/permission checks; avoid opening a socket connection here
  const { setUserRole, canEmit } = useWebSocket({ autoConnect: false });
  const [accessControl, setAccessControl] = useState({
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
  });

  useEffect(() => {
    if (!user?.role) return;
    // Set role in the new simplified service (string-compatible)
    setUserRole(user.role as unknown as any);

    // Derive access flags from standardized event permissions
    const canTimer = canEmit('timer_update');
    const canMatch = canEmit('match_update') || canEmit('match_state_change');
    const canScore = canEmit('score_update');
    const canDisplay = canEmit('display_mode_change') || canEmit('announcement');

    // Management flags are role-based (not websocket-driven)
    const isAdmin = user.role === UserRole.ADMIN;

    setAccessControl({
      canControlTimer: canTimer,
      canControlMatch: canMatch,
      canUpdateScores: canScore,
      canControlDisplay: canDisplay,
      canManageTournament: isAdmin,
      canManageUsers: isAdmin,
      canManageFields: isAdmin,
      showTimerControls: canTimer,
      showMatchControls: canMatch,
      showScoringPanel: canScore,
      showDisplayControls: canDisplay,
    });
  }, [user?.role, setUserRole, canEmit]);

  // No explicit role change subscription needed; we react to auth role changes above

  /**
   * Get access denied message for a specific feature
   */
  const getAccessDeniedMessage = (feature: string): string => {
    const roleDescriptions: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Full system access',
      [UserRole.HEAD_REFEREE]: 'Full match control access',
      [UserRole.ALLIANCE_REFEREE]: 'Scoring access only',
      [UserRole.TEAM_LEADER]: 'View-only access',
      [UserRole.TEAM_MEMBER]: 'View-only access',
      [UserRole.COMMON]: 'Guest access'
    };

    const currentRole = user?.role as UserRole || UserRole.COMMON;
    const roleDescription = roleDescriptions[currentRole];

    switch (feature) {
      case 'timer':
        return `Access Denied: Timer controls require HEAD_REFEREE or ADMIN role. Current role: ${currentRole} (${roleDescription})`;
      case 'match':
        return `Access Denied: Match controls require HEAD_REFEREE, ADMIN, or ALLIANCE_REFEREE role. Current role: ${currentRole} (${roleDescription})`;
      case 'display':
        return `Access Denied: Display controls require HEAD_REFEREE or ADMIN role. Current role: ${currentRole} (${roleDescription})`;
      default:
        return `Access Denied: This feature requires higher privileges. Current role: ${currentRole} (${roleDescription})`;
    }
  };

  /**
   * Check if current user can access a specific feature
   */
  const canAccess = (feature: 'timer' | 'match' | 'scoring' | 'display'): boolean => {
    switch (feature) {
      case 'timer':
        return accessControl.canControlTimer;
      case 'match':
        return accessControl.canControlMatch;
      case 'scoring':
        return accessControl.canUpdateScores;
      case 'display':
        return accessControl.canControlDisplay;
      default:
        return false;
    }
  };

  /**
   * Get role-specific styling for UI elements
   */
  const getRoleBasedStyling = (feature: string) => {
    const hasAccess = canAccess(feature as any);
    
    return {
      container: hasAccess 
        ? 'opacity-100' 
        : 'opacity-50 pointer-events-none',
      button: hasAccess 
        ? 'bg-primary hover:bg-primary/90' 
        : 'bg-gray-300 cursor-not-allowed',
      text: hasAccess 
        ? 'text-foreground' 
        : 'text-muted-foreground'
    };
  };

  return {
    // Access control flags
    ...accessControl,
    
    // Current user info
    currentRole: user?.role as UserRole || UserRole.COMMON,
    currentUser: user,
    
    // Utility functions
    canAccess,
    getAccessDeniedMessage,
    getRoleBasedStyling,
    
    // Role checks for specific features
    isAdmin: user?.role === UserRole.ADMIN,
    isHeadReferee: user?.role === UserRole.HEAD_REFEREE,
    isAllianceReferee: user?.role === UserRole.ALLIANCE_REFEREE,
    isReferee: user?.role === UserRole.HEAD_REFEREE || user?.role === UserRole.ALLIANCE_REFEREE,
    
    // Combined access checks
    hasFullAccess: user?.role === UserRole.ADMIN || user?.role === UserRole.HEAD_REFEREE,
    hasScoringAccess: user?.role === UserRole.ADMIN || user?.role === UserRole.HEAD_REFEREE || user?.role === UserRole.ALLIANCE_REFEREE,
  };
}