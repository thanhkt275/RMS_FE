import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FormProfile } from '../types';
import { useAuth } from '@/hooks/common/use-auth';
import { UserRole } from '@/types/user.types';

interface FormModeToggleProps {
  currentProfile: FormProfile;
  onProfileChange: (profile: FormProfile) => void;
  disabled?: boolean;
}

/**
 * Form Mode Toggle Component
 * Allows admin users to switch between simple and detailed form modes
 */
export function FormModeToggle({ 
  currentProfile, 
  onProfileChange, 
  disabled = false 
}: FormModeToggleProps) {
  const { user } = useAuth();

  // Only show toggle for admin users
  if (user?.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <span className="text-xs sm:text-sm font-medium text-blue-700">Form Mode:</span>
      <ToggleGroup 
        value={currentProfile} 
        onValueChange={(value) => value && onProfileChange(value as FormProfile)}
        type="single"
        disabled={disabled}
        className="justify-start sm:justify-center"
      >
        <ToggleGroupItem value="simple" className="text-xs touch-target">
          <span className="hidden sm:inline">Quick Entry</span>
          <span className="sm:hidden">Quick</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="detailed" className="text-xs touch-target">
          <span className="hidden sm:inline">Full Details</span>
          <span className="sm:hidden">Details</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="admin" className="text-xs touch-target">
          Admin
        </ToggleGroupItem>
      </ToggleGroup>
      <span className="text-xs text-blue-600">
        <span className="hidden sm:inline">Switch between different form complexities</span>
        <span className="sm:hidden">Switch form complexity</span>
      </span>
    </div>
  );
}
