import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User, CheckCircle, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/common/use-auth';
import { UserRole } from '@/types/user.types';
import { FormMode } from '../types';

interface UserAutoPopulationNoticeProps {
  mode: FormMode;
  maxTeamMembers?: number;
}

/**
 * Component to inform users about auto-population of their data
 * and role promotion for COMMON users
 */
export function UserAutoPopulationNotice({ mode, maxTeamMembers }: UserAutoPopulationNoticeProps) {
  const { user } = useAuth();

  // Only show for COMMON users in create mode
  if (mode !== 'create' || !user || user.role !== UserRole.COMMON) {
    return null;
  }

  const additionalSlots = maxTeamMembers ? maxTeamMembers - 1 : 'additional';

  return (
    <Alert className="border-blue-200 bg-blue-50 text-blue-800">
      <Crown className="h-4 w-4" />
      <AlertTitle className="text-blue-900">Welcome to Team Registration!</AlertTitle>
      <AlertDescription>
        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>You're automatically set as the <strong>Team Captain</strong> (first member)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Your profile information has been pre-filled</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>You'll be promoted to <strong>Team Leader</strong> after registration</span>
          </div>
          {maxTeamMembers && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>You can add up to <strong>{additionalSlots} more members</strong> (total: {maxTeamMembers})</span>
            </div>
          )}
          <p className="text-sm text-blue-700 mt-3">
            Please review your information and add your team members to complete the registration.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
