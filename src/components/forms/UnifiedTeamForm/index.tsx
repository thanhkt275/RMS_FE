"use client";

import React, { useState, useEffect } from 'react';
import { Form } from '@/components/ui/form';
import { 
  FormProfile, 
  UnifiedTeamFormProps 
} from '@/components/forms/UnifiedTeamForm/types';
import { 
  useFormProfile, 
  useTeamFormValidation, 
  useTeamFormSubmission, 
  useFormCancellation,
  useTeamLimitValidation,
  useUserAutoPopulation
} from './hooks/index';
import {
  TeamInfoSection,
  TeamMemberSection,
  DetailedFormSection,
  FormModeToggle,
  FormActions,
  TeamLimitWarning,
  UserAutoPopulationNotice,
  TeamCompositionSummary
} from './components/index';

/**
 * Unified Team Registration Form
 * 
 * A flexible form component that adapts to different user contexts:
 * - Simple mode: Basic team registration
 * - Detailed mode: Comprehensive member information
 * - Admin mode: Streamlined admin interface
 * 
 * @param props UnifiedTeamFormProps
 */
export function UnifiedTeamForm({
  profile: explicitProfile,
  mode = 'create',
  tournament,
  defaultValues,
  maxTeamMembers,
  onSuccess,
  onCancel,
  onSubmit: customSubmit,
  className = '',
  showModeToggle = false,
}: UnifiedTeamFormProps) {
  // Determine form profile
  const detectedProfile = useFormProfile({
    explicitProfile,
    tournament,
    isAdminContext: typeof window !== 'undefined' && window.location.pathname.includes('/admin/')
  });

  // Allow dynamic profile switching for admins
  const [currentProfile, setCurrentProfile] = useState<FormProfile>(detectedProfile);

  // Update profile when detection changes
  useEffect(() => {
    if (!showModeToggle) {
      setCurrentProfile(detectedProfile);
    }
  }, [detectedProfile, showModeToggle]);

  // Auto-populate user data for COMMON users in create mode
  const autoPopulatedDefaults = useUserAutoPopulation(mode, defaultValues);

  // Form validation setup
  const { form, isDirty } = useTeamFormValidation(
    currentProfile,
    maxTeamMembers,
    autoPopulatedDefaults
  );

  // Form submission logic
  const { submitForm, isSubmitting } = useTeamFormSubmission(
    currentProfile,
    mode,
    onSuccess
  );

  // Team limit validation (only for create mode)
  const teamLimitValidation = useTeamLimitValidation(
    tournament?.id,
    mode
  );

  // Form cancellation
  const handleCancel = useFormCancellation(isDirty, onCancel);

  // Handle form submission with team limit check
  const handleSubmit = async (data: any) => {
    // Check team limits before submission for create mode
    if (mode === 'create' && !teamLimitValidation.canSubmit) {
      return; // Prevent submission if at team limit
    }

    if (customSubmit) {
      await customSubmit(data);
    } else {
      await submitForm(data);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Form Mode Toggle - Only for admins when enabled */}
      {showModeToggle && (
        <FormModeToggle
          currentProfile={currentProfile}
          onProfileChange={setCurrentProfile}
          disabled={isSubmitting}
        />
      )}

      {/* User Auto-Population Notice - For COMMON users in create mode */}
      <UserAutoPopulationNotice 
        mode={mode} 
        maxTeamMembers={maxTeamMembers || tournament?.maxTeamMembers}
      />

      {/* Team Limit Warning - Show for create mode only */}
      {mode === 'create' && tournament?.maxTeams && (
        <TeamLimitWarning
          isAtLimit={teamLimitValidation.isAtLimit}
          isNearLimit={teamLimitValidation.isNearLimit}
          currentCount={teamLimitValidation.currentCount}
          maxTeams={teamLimitValidation.maxTeams}
          message={teamLimitValidation.message}
          warningMessage={teamLimitValidation.warningMessage}
        />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Team Information Section */}
          <TeamInfoSection
            form={form}
            profile={currentProfile}
            isLoading={isSubmitting}
          />

          {/* Team Members Section */}
          <TeamMemberSection
            form={form}
            profile={currentProfile}
            isLoading={isSubmitting}
            maxTeamMembers={maxTeamMembers}
          />

          {/* Team Composition Summary */}
          <TeamCompositionSummary
            memberCount={form.watch('teamMembers')?.length || 0}
            maxTeamMembers={maxTeamMembers || tournament?.maxTeamMembers}
            mode={mode}
          />

          {/* Detailed Form Additional Fields */}
          <DetailedFormSection
            form={form}
            profile={currentProfile}
            isLoading={isSubmitting}
          />

          {/* Form Actions */}
          <FormActions
            profile={currentProfile}
            mode={mode}
            isDirty={isDirty}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            disableSubmit={mode === 'create' && teamLimitValidation.isAtLimit}
            disableReason={teamLimitValidation.message || undefined}
          />
        </form>
      </Form>
    </div>
  );
}

export default UnifiedTeamForm;

// Re-export types and utilities
export type { 
  FormProfile, 
  UnifiedTeamFormProps, 
  FormMode,
  TeamFormData,
  TeamMemberFormData
} from '@/components/forms/UnifiedTeamForm/types';

export * from './hooks/index';
export * from './schemas/index';
export * from './components/index';
