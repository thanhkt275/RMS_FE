import { useMemo } from 'react';
import { useAuth } from '@/hooks/common/use-auth';
import { FormProfile, FormProfileProps } from '../types';

/**
 * Hook to determine the appropriate form profile based on context
 * 
 * @param props Configuration for profile detection
 * @returns The determined form profile
 */
export function useFormProfile(props: FormProfileProps = {}): FormProfile {
  const { user } = useAuth();
  
  return useMemo(() => {
    // If explicit profile is provided, use it
    if (props.explicitProfile) {
      return props.explicitProfile;
    }

    // Determine user role from props or auth context
    const userRole = props.userRole || user?.role;
    
    // Admin context detection
    const isAdminContext = props.isAdminContext || 
      (typeof window !== 'undefined' && window.location.pathname.includes('/admin/'));

    // Admin users in admin context get admin profile
    if (userRole === 'ADMIN' && isAdminContext) {
      return 'admin';
    }

    // Check tournament settings for detailed registration requirement
    // Note: This is a hypothetical property - adjust based on actual Tournament interface
    if (props.tournament && 'requiresDetailedRegistration' in props.tournament) {
      return 'detailed';
    }

    // Admin users outside admin context get simple profile by default
    if (userRole === 'ADMIN') {
      return 'simple';
    }

    // Default to detailed for regular users (can be overridden by tournament settings)
    return 'detailed';
  }, [
    props.explicitProfile,
    props.userRole,
    props.tournament,
    props.isAdminContext,
    user?.role
  ]);
}

/**
 * Hook to check if a profile supports specific features
 * 
 * @param profile The form profile to check
 * @returns Object with feature availability flags
 */
export function useProfileFeatures(profile: FormProfile) {
  return useMemo(() => ({
    hasDetailedMemberInfo: profile === 'detailed',
    hasTeamNumber: profile === 'admin',
    hasReferralSource: profile === 'detailed',
    hasTermsAcceptance: profile === 'detailed',
    hasQuickEntry: profile === 'admin' || profile === 'simple',
    hasAgeValidation: profile === 'detailed',
    hasLocationFields: profile === 'detailed',
    hasOrganizationFields: profile === 'detailed',
    allowsModeToggle: profile === 'adaptive',
  }), [profile]);
}

/**
 * Hook to get default values based on form profile
 * 
 * @param profile The form profile
 * @param tournament Optional tournament context
 * @returns Default form values
 */
export function useFormDefaults(profile: FormProfile, tournament?: any) {
  return useMemo(() => {
    const baseDefaults = {
      name: "",
      teamMembers: [{
        name: "",
        email: "",
        role: profile === 'admin' ? "Captain" : "Member"
      }]
    };

    if (profile === 'detailed') {
      return {
        ...baseDefaults,
        teamMembers: [{
          ...baseDefaults.teamMembers[0],
          gender: null,
          phoneNumber: "",
          province: "",
          ward: "",
          organization: "",
          organizationAddress: "",
          dateOfBirth: new Date().toISOString().split('T')[0],
        }],
        referralSource: "",
        termsAccepted: false
      };
    }

    if (profile === 'admin') {
      return {
        ...baseDefaults,
        teamNumber: 1,
        description: "",
      };
    }

    return baseDefaults;
  }, [profile]);
}
