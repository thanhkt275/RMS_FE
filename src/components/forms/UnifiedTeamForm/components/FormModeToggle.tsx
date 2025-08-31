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
    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <span className="text-sm font-medium text-blue-700">Form Mode:</span>
      <ToggleGroup 
        value={currentProfile} 
        onValueChange={(value) => value && onProfileChange(value as FormProfile)}
        type="single"
        disabled={disabled}
      >
        <ToggleGroupItem value="simple" className="text-xs">
          Quick Entry
        </ToggleGroupItem>
        <ToggleGroupItem value="detailed" className="text-xs">
          Full Details
        </ToggleGroupItem>
        <ToggleGroupItem value="admin" className="text-xs">
          Admin Mode
        </ToggleGroupItem>
      </ToggleGroup>
      <span className="text-xs text-blue-600">
        Switch between different form complexities
      </span>
    </div>
  );
}
