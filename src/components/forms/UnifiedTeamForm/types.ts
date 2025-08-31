import { Tournament } from '@/types/types';
import { TeamMember } from '@/types/team.types';
import { UserRole } from '@/types/user.types';

/**
 * Form profiles determine which fields are shown and validation rules applied
 */
export type FormProfile = 'simple' | 'detailed' | 'admin' | 'adaptive';

/**
 * Form modes for create vs edit scenarios
 */
export type FormMode = 'create' | 'edit';

/**
 * Base team form data structure
 */
export interface BaseTeamFormData {
  id?: string;
  name: string;
  description?: string;
  teamNumber?: number;
  teamMembers: TeamMemberFormData[];
}

/**
 * Extended team form data with detailed registration fields
 */
export interface DetailedTeamFormData extends BaseTeamFormData {
  referralSource: string;
  termsAccepted: boolean;
}

/**
 * Team member form data structure
 */
export interface TeamMemberFormData {
  id?: string;
  name: string;
  email?: string;
  role?: string;
  gender?: string | null;
  phoneNumber?: string;
  province?: string;
  ward?: string;
  organization?: string;
  organizationAddress?: string;
  dateOfBirth?: string;
}

/**
 * Union type for all possible form data structures
 */
export type TeamFormData = BaseTeamFormData | DetailedTeamFormData;

/**
 * Props for form profile detection
 */
export interface FormProfileProps {
  userRole?: UserRole;
  tournament?: Tournament;
  explicitProfile?: FormProfile;
  isAdminContext?: boolean;
}

/**
 * Main props for the unified team form component
 */
export interface UnifiedTeamFormProps {
  /** Form profile - determines complexity and fields shown */
  profile?: FormProfile;
  
  /** Form mode - create new team or edit existing */
  mode?: FormMode;
  
  /** Tournament context */
  tournament?: Tournament;
  
  /** Default values for edit mode */
  defaultValues?: TeamFormData;
  
  /** Maximum number of team members allowed */
  maxTeamMembers?: number;
  
  /** Callback when form is successfully submitted */
  onSuccess?: (data: TeamFormData) => void;
  
  /** Callback when form is cancelled */
  onCancel?: () => void;
  
  /** Custom submit handler (overrides default) */
  onSubmit?: (data: TeamFormData) => Promise<void>;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Whether to show form mode toggle for admins */
  showModeToggle?: boolean;
}

/**
 * Props for individual form sections
 */
export interface FormSectionProps {
  profile: FormProfile;
  isLoading?: boolean;
}

/**
 * Props for team member card component
 */
export interface TeamMemberCardProps extends FormSectionProps {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}

/**
 * Props for form actions section
 */
export interface FormActionsProps extends FormSectionProps {
  isDirty: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  mode: FormMode;
  disableSubmit?: boolean;
  disableReason?: string;
}
