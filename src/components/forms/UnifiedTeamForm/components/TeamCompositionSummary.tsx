import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Users, User } from 'lucide-react';
import { useAuth } from '@/hooks/common/use-auth';
import { UserRole } from '@/types/user.types';

interface TeamCompositionSummaryProps {
  memberCount: number;
  maxTeamMembers?: number;
  mode: 'create' | 'edit';
}

/**
 * Shows a visual summary of the team composition
 * Helps users understand their team structure at a glance
 */
export function TeamCompositionSummary({ 
  memberCount, 
  maxTeamMembers, 
  mode 
}: TeamCompositionSummaryProps) {
  const { user } = useAuth();
  
  // Only show for COMMON/TEAM_LEADER users in create mode
  if (mode !== 'create' || !user || 
      (user.role !== UserRole.COMMON && user.role !== UserRole.TEAM_LEADER)) {
    return null;
  }

  const remainingSlots = maxTeamMembers ? maxTeamMembers - memberCount : 0;
  const isTeamComplete = maxTeamMembers && memberCount >= maxTeamMembers;

  return (
    <Card className="bg-gray-50 border-gray-200">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Team Captain */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                <Crown className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-green-700">Team Captain</div>
                <div className="text-gray-600">You</div>
              </div>
            </div>

            {/* Team Members */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-blue-700">Team Members</div>
                <div className="text-gray-600">
                  {memberCount - 1} added
                  {maxTeamMembers && ` (${remainingSlots} slots left)`}
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {memberCount}{maxTeamMembers && `/${maxTeamMembers}`} Members
            </div>
            <div className={`text-xs ${isTeamComplete ? 'text-green-600' : 'text-amber-600'}`}>
              {isTeamComplete ? 'Team Complete!' : 
               remainingSlots > 0 ? `${remainingSlots} more needed` : 'Add more members'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {maxTeamMembers && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isTeamComplete ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${(memberCount / maxTeamMembers) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 (You)</span>
              <span>{maxTeamMembers} (Max)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
