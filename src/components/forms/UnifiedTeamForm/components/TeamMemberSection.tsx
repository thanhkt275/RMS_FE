import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Info } from 'lucide-react';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { TeamMemberCard } from './TeamMemberCard';
import { FormSectionProps } from '../types';
import { useAuth } from '@/hooks/common/use-auth';
import { UserRole } from '@/types/user.types';
import { toast } from 'sonner';

interface TeamMemberSectionProps extends FormSectionProps {
  form: UseFormReturn<any>;
  maxTeamMembers?: number;
}

/**
 * Team Members Section Component
 * Manages the dynamic list of team members with add/remove functionality
 */
export function TeamMemberSection({ 
  form, 
  profile, 
  isLoading = false, 
  maxTeamMembers 
}: TeamMemberSectionProps) {
  const { user } = useAuth();
  const { fields, append, remove } = useFieldArray({
    name: "teamMembers",
    control: form.control,
  });

  // Check if current user is the team creator (first member in create mode)
  const isCreatorFirstMember = user && (user.role === UserRole.COMMON || user.role === UserRole.TEAM_LEADER);
  
  // Calculate remaining slots: if creator is first member, they take 1 slot
  const remainingSlots = maxTeamMembers ? maxTeamMembers - fields.length : null;

  const addTeamMember = () => {
    if (maxTeamMembers && fields.length >= maxTeamMembers) {
      toast.error(`Maximum ${maxTeamMembers} members allowed per team`);
      return;
    }

    // Default member data based on profile
    const defaultMember = {
      name: "",
      email: "",
      role: profile === 'admin' ? "Member" : "",
    };

    // Add detailed fields for detailed profile
    if (profile === 'detailed') {
      Object.assign(defaultMember, {
        gender: null,
        phoneNumber: "",
        province: "",
        ward: "",
        organization: "",
        organizationAddress: "",
        dateOfBirth: new Date().toISOString().split('T')[0],
      });
    }

    append(defaultMember);
  };

  const removeTeamMember = (index: number) => {
    // Prevent removing the first member if they are the team creator
    if (index === 0 && isCreatorFirstMember) {
      toast.error("Cannot remove the team captain (yourself)");
      return;
    }
    
    if (fields.length <= 1) {
      toast.error("At least one team member is required");
      return;
    }
    remove(index);
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">Team Members ({fields.length}
              {maxTeamMembers && `/${maxTeamMembers}`})</span>
            </CardTitle>
            {isCreatorFirstMember && fields.length > 0 && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-green-700 bg-green-100 px-2 sm:px-3 py-1 rounded-full">
                <Info className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">You are the team captain</span>
                <span className="sm:hidden">Captain</span>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTeamMember}
            disabled={
              isLoading || 
              (maxTeamMembers ? fields.length >= maxTeamMembers : false)
            }
            className="flex items-center justify-center gap-2 min-h-[40px] touch-target w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Member</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
        
        {/* Information about team composition */}
        {maxTeamMembers && isCreatorFirstMember && (
          <div className="text-xs sm:text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p>
              <span className="font-medium">Team setup:</span> You are automatically set as the team captain (first member). 
              {remainingSlots !== null && remainingSlots > 0 && (
                <span> You can add up to {remainingSlots} more members.</span>
              )}
              {remainingSlots === 0 && (
                <span> Your team is full!</span>
              )}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
        {fields.map((field, index) => (
          <TeamMemberCard
            key={field.id}
            index={index}
            profile={profile}
            isLoading={isLoading}
            canRemove={
              fields.length > 1 && 
              !(index === 0 && isCreatorFirstMember) // Cannot remove team creator
            }
            onRemove={() => removeTeamMember(index)}
            form={form}
          />
        ))}
        
        {/* Max members warning */}
        {maxTeamMembers && fields.length >= maxTeamMembers && (
          <div className="text-xs sm:text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
            You have reached the maximum number of team members ({maxTeamMembers}).
          </div>
        )}
      </CardContent>
    </Card>
  );
}
