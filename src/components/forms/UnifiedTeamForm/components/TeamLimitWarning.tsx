import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, AlertTriangle, Info } from 'lucide-react';

interface TeamLimitWarningProps {
  isAtLimit: boolean;
  isNearLimit: boolean;
  currentCount: number;
  maxTeams: number | null;
  message: string | null;
  warningMessage: string | null;
  className?: string;
}

/**
 * Component to display team limit warnings and information
 */
export function TeamLimitWarning({
  isAtLimit,
  isNearLimit,
  currentCount,
  maxTeams,
  message,
  warningMessage,
  className = '',
}: TeamLimitWarningProps) {
  // Don't render if no limits are set
  if (!maxTeams) {
    return null;
  }

  // Render blocking message when at limit
  if (isAtLimit && message) {
    return (
      <Alert variant="destructive" className={`border-red-500 bg-red-50 ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-red-700 font-medium">
          {message}
        </AlertDescription>
      </Alert>
    );
  }

  // Render warning when near limit
  if (isNearLimit && warningMessage) {
    return (
      <Alert variant="default" className={`border-yellow-500 bg-yellow-50 ${className}`}>
        <Info className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-700">
          <strong>Registration Notice:</strong> {warningMessage}
        </AlertDescription>
      </Alert>
    );
  }

  // Render info message showing current count when not at/near limit
  return (
    <Alert variant="default" className={`border-blue-500 bg-blue-50 ${className}`}>
      <Users className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-700">
        <strong>Current Registration:</strong> {currentCount} of {maxTeams} teams registered.
      </AlertDescription>
    </Alert>
  );
}
