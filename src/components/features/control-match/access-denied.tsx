import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldX, Lock, Info } from 'lucide-react';
import { UserRole } from '@/types/types';

interface AccessDeniedProps {
  feature: string;
  message: string;
  currentRole: UserRole;
  requiredRoles?: UserRole[];
  showUpgradeInfo?: boolean;
}

export function AccessDenied({ 
  feature, 
  message, 
  currentRole, 
  requiredRoles = [],
  showUpgradeInfo = true 
}: AccessDeniedProps) {
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

  return (
    <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
      <CardHeader className="text-center pb-3">
        <div className="flex justify-center mb-2">
          <ShieldX className="h-12 w-12 text-gray-400" />
        </div>
        <CardTitle className="text-lg text-gray-600 flex items-center justify-center gap-2">
          <Lock className="h-5 w-5" />
          Access Restricted
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {message}
          </AlertDescription>
        </Alert>

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
          Feature: {feature}
        </div>
      </CardContent>
    </Card>
  );
}

interface AccessDeniedOverlayProps {
  feature: string;
  message: string;
  currentRole: UserRole;
  children: React.ReactNode;
  showOverlay?: boolean;
}

/**
 * Overlay component that can be wrapped around restricted content
 */
export function AccessDeniedOverlay({ 
  feature, 
  message, 
  currentRole, 
  children, 
  showOverlay = true 
}: AccessDeniedOverlayProps) {
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
          <AccessDenied
            feature={feature}
            message={message}
            currentRole={currentRole}
            showUpgradeInfo={false}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Simple access denied message for inline use
 */
export function AccessDeniedInline({ message, currentRole }: { message: string; currentRole: UserRole }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
      <Lock className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
      <span className="ml-auto text-xs font-medium">
        Role: {currentRole}
      </span>
    </div>
  );
}