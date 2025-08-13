/**
 * Team Access Denied Components
 * 
 * Provides team-specific access denied components using existing RBAC error patterns
 * and integrating with the existing error handling infrastructure.
 * 
 * Features:
 * - Follows existing AccessDenied component patterns
 * - Integrates with existing loading states and error handling
 * - Provides team-specific error messages and tooltips
 * - Uses existing UI components and styling
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldX, Lock, Info, Users, Eye, Edit, Trash2, Upload, Download } from 'lucide-react';
import { UserRole } from '@/types/types';
import type { Team } from '@/types/team.types';
import { TeamErrorHandler } from '@/utils/teams/team-error-handler';

interface TeamAccessDeniedProps {
  operation: string;
  message?: string;
  currentRole: UserRole;
  requiredRoles?: UserRole[];
  team?: Team;
  showUpgradeInfo?: boolean;
}

/**
 * Team-specific access denied component
 */
export function TeamAccessDenied({ 
  operation,
  message, 
  currentRole, 
  requiredRoles = [],
  team,
  showUpgradeInfo = true 
}: TeamAccessDeniedProps) {
  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrator';
      case UserRole.HEAD_REFEREE:
        return 'Head Referee';
      case UserRole.ALLIANCE_REFEREE:
        return 'Alliance Referee';
      case UserRole.TEAM_LEADER:
        return 'Team Leader';
      case UserRole.TEAM_MEMBER:
        return 'Team Member';
      case UserRole.COMMON:
        return 'Guest';
      default:
        return 'Unknown';
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return 'text-red-600';
      case UserRole.HEAD_REFEREE:
        return 'text-blue-600';
      case UserRole.ALLIANCE_REFEREE:
        return 'text-green-600';
      case UserRole.TEAM_LEADER:
        return 'text-purple-600';
      case UserRole.TEAM_MEMBER:
        return 'text-orange-600';
      case UserRole.COMMON:
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation.toLowerCase()) {
      case 'create':
        return <Users className="h-5 w-5" />;
      case 'edit':
        return <Edit className="h-5 w-5" />;
      case 'delete':
        return <Trash2 className="h-5 w-5" />;
      case 'view':
      case 'view_sensitive':
      case 'view_members':
        return <Eye className="h-5 w-5" />;
      case 'import':
        return <Upload className="h-5 w-5" />;
      case 'export':
        return <Download className="h-5 w-5" />;
      default:
        return <Lock className="h-5 w-5" />;
    }
  };

  const displayMessage = message || TeamErrorHandler.getTooltipMessage(operation, currentRole, team);

  return (
    <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
      <CardHeader className="text-center pb-3">
        <div className="flex justify-center mb-2">
          <ShieldX className="h-12 w-12 text-gray-400" />
        </div>
        <CardTitle className="text-lg text-gray-600 flex items-center justify-center gap-2">
          {getOperationIcon(operation)}
          Team Access Restricted
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {displayMessage}
          </AlertDescription>
        </Alert>

        {team && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <div className="font-medium">Team: {team.name}</div>
              {team.teamNumber && (
                <div className="text-xs text-blue-600 mt-1">Team Number: {team.teamNumber}</div>
              )}
              {team.teamMembers && team.teamMembers.length > 0 && team.teamMembers[0].organization && (
                <div className="text-xs text-blue-600 mt-1">Organization: {team.teamMembers[0].organization}</div>
              )}
            </div>
          </div>
        )}

        <div className="text-center space-y-2">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Current Role:</span>{' '}
            <span className={`font-semibold ${getRoleColor(currentRole)}`}>
              {getRoleDisplayName(currentRole)}
            </span>
          </div>

          {requiredRoles.length > 0 && showUpgradeInfo && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Required Role(s):</span>{' '}
              <span className="font-semibold text-blue-600">
                {requiredRoles.map(getRoleDisplayName).join(' or ')}
              </span>
            </div>
          )}
        </div>

        {showUpgradeInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-sm text-blue-800">
              <Info className="h-4 w-4 inline mr-1" />
              Contact your tournament administrator to request role upgrade if needed.
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          Operation: {operation}
        </div>
      </CardContent>
    </Card>
  );
}

interface TeamAccessDeniedOverlayProps {
  operation: string;
  message?: string;
  currentRole: UserRole;
  team?: Team;
  children: React.ReactNode;
  showOverlay?: boolean;
}

/**
 * Overlay component that can be wrapped around restricted team content
 */
export function TeamAccessDeniedOverlay({ 
  operation,
  message, 
  currentRole, 
  team,
  children, 
  showOverlay = true 
}: TeamAccessDeniedOverlayProps) {
  if (!showOverlay) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Original content with reduced opacity */}
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="max-w-md w-full mx-4">
          <TeamAccessDenied
            operation={operation}
            message={message}
            currentRole={currentRole}
            team={team}
            showUpgradeInfo={false}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Simple team access denied message for inline use
 */
export function TeamAccessDeniedInline({ 
  operation,
  message, 
  currentRole, 
  team 
}: { 
  operation: string;
  message?: string; 
  currentRole: UserRole;
  team?: Team;
}) {
  const displayMessage = message || TeamErrorHandler.getTooltipMessage(operation, currentRole, team);
  
  return (
    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
      <Lock className="h-4 w-4 flex-shrink-0" />
      <span>{displayMessage}</span>
      <span className="ml-auto text-xs font-medium">
        Role: {currentRole}
      </span>
    </div>
  );
}

/**
 * Team loading state component that integrates with existing patterns
 */
export function TeamLoadingState({ message = "Loading team data..." }: { message?: string }) {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <div className="text-gray-600 font-medium">{message}</div>
          <div className="text-sm text-gray-500">Please wait while we load the team information...</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Team error state component that integrates with existing patterns
 */
export function TeamErrorState({ 
  error, 
  onRetry,
  operation = "load team data"
}: { 
  error: Error | string;
  onRetry?: () => void;
  operation?: string;
}) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <ShieldX className="h-12 w-12 text-red-400" />
            </div>
            <CardTitle className="text-lg text-red-600">
              Error Loading Team Data
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4 text-center">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Failed to {operation}: {errorMessage}
              </AlertDescription>
            </Alert>

            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            )}

            <div className="text-xs text-gray-500">
              If this problem persists, please contact your administrator.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}