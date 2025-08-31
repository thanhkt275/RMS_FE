import { useMemo } from 'react';
import { useAuth } from '@/hooks/common/use-auth';
import { FormMode, TeamFormData, TeamMemberFormData } from '../types';
import { UserRole } from '@/types/user.types';

/**
 * Hook to auto-populate user data for COMMON users registering their first team
 * This promotes the user to TEAM_LEADER role and pre-fills their information
 * 
 * @param mode Form mode (only applies to 'create' mode)
 * @param defaultValues Existing default values
 * @returns Enhanced default values with user auto-population
 */
export function useUserAutoPopulation(
  mode: FormMode,
  defaultValues?: Partial<TeamFormData>
): Partial<TeamFormData> {
  const { user } = useAuth();

  return useMemo(() => {
    // Only auto-populate for create mode and COMMON users
    if (mode !== 'create' || !user || user.role !== UserRole.COMMON) {
      return defaultValues || {};
    }

    // Create auto-populated first team member from current user data
    const autoPopulatedMember: TeamMemberFormData = {
      name: user.name || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      gender: user.gender || null,
      dateOfBirth: user.dateOfBirth 
        ? (user.dateOfBirth instanceof Date 
           ? user.dateOfBirth.toISOString().split('T')[0] 
           : user.dateOfBirth)
        : new Date().toISOString().split('T')[0],
      // Set default values for required fields that user might not have
      province: "",
      ward: "",
      organization: "",
      organizationAddress: "",
      role: "Team Captain" // First member becomes team captain
    };

    // Merge with existing defaults
    const enhancedDefaults: Partial<TeamFormData> = {
      ...defaultValues,
      teamMembers: [
        autoPopulatedMember,
        ...(defaultValues?.teamMembers || []).slice(1) // Keep any additional members
      ]
    };

    return enhancedDefaults;
  }, [mode, user, defaultValues]);
}

/**
 * Hook to check if current user should be auto-promoted to TEAM_LEADER
 * 
 * @param mode Form mode
 * @returns Whether user should be promoted after successful team registration
 */
export function useUserRolePromotion(mode: FormMode) {
  const { user } = useAuth();

  return useMemo(() => {
    const shouldPromote = mode === 'create' && 
                         user && 
                         user.role === UserRole.COMMON;

    return {
      shouldPromote,
      currentRole: user?.role,
      targetRole: UserRole.TEAM_LEADER,
      userId: user?.id
    };
  }, [mode, user]);
}

/**
 * Hook to provide user context for team registration
 * 
 * @returns User context information for team registration
 */
export function useUserRegistrationContext() {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return {
        isAuthenticated: false,
        canRegisterTeam: false,
        needsPromotion: false,
        registrationFlow: 'guest' as const
      };
    }

    // COMMON users can register and will be promoted
    if (user.role === UserRole.COMMON) {
      return {
        isAuthenticated: true,
        canRegisterTeam: true,
        needsPromotion: true,
        registrationFlow: 'user-promotion' as const,
        userInfo: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth
        }
      };
    }

    // TEAM_LEADERs can register additional teams
    if (user.role === UserRole.TEAM_LEADER) {
      return {
        isAuthenticated: true,
        canRegisterTeam: true,
        needsPromotion: false,
        registrationFlow: 'existing-leader' as const,
        userInfo: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth
        }
      };
    }

    // ADMINs can register teams for others
    if (user.role === UserRole.ADMIN) {
      return {
        isAuthenticated: true,
        canRegisterTeam: true,
        needsPromotion: false,
        registrationFlow: 'admin' as const
      };
    }

    // Other roles cannot register teams
    return {
      isAuthenticated: true,
      canRegisterTeam: false,
      needsPromotion: false,
      registrationFlow: 'restricted' as const
    };
  }, [user]);
}
