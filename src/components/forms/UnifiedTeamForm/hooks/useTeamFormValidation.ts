import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTeamFormSchema } from '../schemas';
import { FormProfile, TeamFormData } from '../types';
import { useFormDefaults } from './useFormProfile';

/**
 * Hook to set up form validation based on profile
 * 
 * @param profile The form profile determining validation rules
 * @param maxTeamMembers Optional maximum team members
 * @param defaultValues Optional default form values
 * @returns React Hook Form instance with appropriate validation
 */
export function useTeamFormValidation(
  profile: FormProfile,
  maxTeamMembers?: number,
  defaultValues?: Partial<TeamFormData>
) {
  // Get profile-specific default values
  const profileDefaults = useFormDefaults(profile);
  
  // Create validation schema based on profile
  const validationSchema = useMemo(
    () => createTeamFormSchema(profile, maxTeamMembers),
    [profile, maxTeamMembers]
  );

  // Merge provided defaults with profile defaults
  const finalDefaults = useMemo(
    () => ({ ...profileDefaults, ...defaultValues }),
    [profileDefaults, defaultValues]
  );

  // Set up form with validation
  const form = useForm<TeamFormData>({
    resolver: zodResolver(validationSchema),
    mode: "onChange",
    defaultValues: finalDefaults,
  });

  return {
    form,
    validationSchema,
    isValid: form.formState.isValid,
    errors: form.formState.errors,
    isDirty: form.formState.isDirty,
  };
}

/**
 * Hook to provide validation utilities for specific form profiles
 * 
 * @param profile The form profile
 * @returns Validation utility functions
 */
export function useValidationUtils(profile: FormProfile) {
  return useMemo(() => ({
    /**
     * Check if a field is required for the current profile
     */
    isFieldRequired: (fieldName: string): boolean => {
      switch (profile) {
        case 'detailed':
          return ['name', 'province', 'ward', 'dateOfBirth', 'referralSource', 'termsAccepted'].includes(fieldName);
        case 'admin':
          return ['name', 'teamNumber'].includes(fieldName);
        case 'simple':
        default:
          return ['name'].includes(fieldName);
      }
    },

    /**
     * Check if a field should be visible for the current profile
     */
    isFieldVisible: (fieldName: string): boolean => {
      const fieldVisibility: Record<FormProfile, string[]> = {
        simple: ['name', 'email', 'role'],
        detailed: ['name', 'email', 'role', 'gender', 'phoneNumber', 'province', 'ward', 'organization', 'organizationAddress', 'dateOfBirth', 'referralSource', 'termsAccepted'],
        admin: ['name', 'email', 'role', 'teamNumber', 'description'],
        adaptive: ['name', 'email', 'role'], // Will be determined at runtime
      };

      return fieldVisibility[profile]?.includes(fieldName) ?? false;
    },

    /**
     * Get field placeholder text based on profile
     */
    getFieldPlaceholder: (fieldName: string): string => {
      const placeholders: Record<string, string> = {
        name: profile === 'admin' ? 'Enter member name' : 'Full name',
        email: profile === 'admin' ? 'Optional email' : 'member@example.com',
        role: profile === 'admin' ? 'Captain/Member' : 'Team role',
        teamNumber: 'Team number',
        province: 'Select province/city',
        ward: 'Enter district',
        organization: 'School/Organization name',
        organizationAddress: 'School/Organization address',
      };

      return placeholders[fieldName] || '';
    },
  }), [profile]);
}
