import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTeamsMutations } from '@/hooks/api/use-teams';
import { useChangeUserRole } from '@/hooks/users/use-users';
import { QueryKeys } from '@/lib/query-keys';
import { Gender, UserRole } from '@/types/user.types';
import { FormProfile, FormMode, TeamFormData, TeamMemberFormData } from '../types';
import { useUserRolePromotion } from './useUserAutoPopulation';

/**
 * Hook to handle team form submission with profile-aware data transformation
 * 
 * @param profile The form profile determining data structure
 * @param mode Whether creating or editing a team
 * @param onSuccess Optional success callback
 * @returns Submission utilities and state
 */
export function useTeamFormSubmission(
  profile: FormProfile,
  mode: FormMode = 'create',
  onSuccess?: (data: TeamFormData) => void
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { createTeam, updateTeam } = useTeamsMutations();
  const changeUserRole = useChangeUserRole();
  
  // Check if user should be promoted after successful team creation
  const rolePromotion = useUserRolePromotion(mode);

  /**
   * Transform team member data for API compatibility
   */
  const transformTeamMembers = (members: TeamMemberFormData[]) => {
    return members.map(member => ({
      ...member,
      gender: member.gender ? member.gender as Gender : null,
      // Ensure all required fields are present and properly typed
      name: member.name || '',
      dateOfBirth: member.dateOfBirth || '',
      province: member.province || '',
      ward: member.ward || '',
    }));
  };

  /**
   * Transform form data based on profile for API submission
   */
  const transformDataForSubmission = (data: TeamFormData) => {
    const transformedMembers = transformTeamMembers(data.teamMembers || []);
    
    const basePayload = {
      name: data.name,
      tournamentId: params.id as string,
      teamMembers: transformedMembers,
      referralSource: '', // Default value - will be overridden based on profile
    };

    // Add profile-specific fields
    switch (profile) {
      case 'detailed':
        if ('referralSource' in data) {
          return {
            ...basePayload,
            referralSource: data.referralSource,
          };
        }
        break;

      case 'admin':
        return {
          ...basePayload,
          referralSource: 'admin', // Default for admin entries
          teamNumber: 'teamNumber' in data ? data.teamNumber : undefined,
          description: data.description,
        };

      case 'simple':
      default:
        return {
          ...basePayload,
          referralSource: 'other', // Default for simple entries
        };
    }

    return {
      ...basePayload,
      referralSource: 'other', // Fallback
    };
  };

  /**
   * Submit form data
   */
  const submitForm = async (data: TeamFormData) => {
    setIsSubmitting(true);
    
    try {
      let result;
      
      if (mode === 'edit' && data.id) {
        // For updates, we need to create the payload differently
        const transformedMembers = transformTeamMembers(data.teamMembers || []);
        
        const updatePayload: any = {
          id: data.id,
          name: data.name,
          tournamentId: params.id as string,
          teamMembers: transformedMembers,
        };

        // Add profile-specific fields for updates
        if (profile === 'detailed' && 'referralSource' in data) {
          updatePayload.referralSource = data.referralSource;
        } else if (profile === 'admin') {
          updatePayload.referralSource = 'admin';
        } else {
          updatePayload.referralSource = 'other';
        }

        result = await updateTeam.mutateAsync(updatePayload);
      } else {
        // For creation, transform the data properly
        const payload = transformDataForSubmission(data);
        result = await createTeam.mutateAsync(payload);
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: QueryKeys.teams.byTournament(params.id as string) 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: QueryKeys.tournaments.all() 
      });

      // Handle user role promotion for COMMON users creating their first team
      if (rolePromotion.shouldPromote && rolePromotion.userId) {
        try {
          await changeUserRole.mutateAsync({
            id: rolePromotion.userId,
            roleData: { 
              role: UserRole.TEAM_LEADER,
              reason: 'Auto-promoted to TEAM_LEADER after successful team registration'
            }
          });
          
          toast.success('Congratulations! You are now a Team Leader!');
        } catch (promotionError) {
          console.error('Failed to promote user:', promotionError);
          // Don't fail the entire operation if promotion fails
          toast.warning('Team registered successfully, but role update failed. Please contact an administrator.');
        }
      }

      // Success notification
      const action = mode === 'edit' ? 'updated' : 'registered';
      toast.success(`Team ${action} successfully!`);

      // Call success callback
      onSuccess?.(data);

      // Default navigation
      if (!onSuccess) {
        router.push(`/tournaments/${params.id}/teams`);
      }

      return result;
    } catch (error: any) {
      const action = mode === 'edit' ? 'update' : 'register';
      toast.error(`Failed to ${action} team: ${error.message || 'Unknown error'}`);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitForm,
    isSubmitting,
    setIsSubmitting,
  };
}

/**
 * Hook to handle form cancellation and cleanup
 * 
 * @param isDirty Whether the form has unsaved changes
 * @param onCancel Optional cancel callback
 * @returns Cancel handler
 */
export function useFormCancellation(
  isDirty: boolean,
  onCancel?: () => void
) {
  const router = useRouter();

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) {
        return;
      }
    }

    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return handleCancel;
}
