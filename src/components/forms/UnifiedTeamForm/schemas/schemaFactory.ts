import { z } from 'zod';
import { FormProfile } from '../types';
import { 
  teamBaseSchema, 
  teamDetailedSchema, 
  teamAdminSchema,
  teamMemberBaseSchema,
  teamMemberDetailedSchema,
  teamMemberAdminSchema
} from './baseSchemas';

/**
 * Factory function to create appropriate validation schema based on form profile
 * 
 * @param profile The form profile determining validation complexity
 * @param maxTeamMembers Optional maximum number of team members
 * @returns Zod schema for validation
 */
export function createTeamFormSchema(profile: FormProfile, maxTeamMembers?: number) {
  switch (profile) {
    case 'detailed': {
      if (maxTeamMembers) {
        return teamDetailedSchema.extend({
          teamMembers: z.array(teamMemberDetailedSchema)
            .min(1, "At least one team member is required")
            .max(maxTeamMembers, `Maximum ${maxTeamMembers} members allowed per team`)
        });
      }
      return teamDetailedSchema;
    }
      
    case 'admin': {
      if (maxTeamMembers) {
        return teamAdminSchema.extend({
          teamMembers: z.array(teamMemberAdminSchema)
            .min(1, "At least one team member is required")
            .max(maxTeamMembers, `Maximum ${maxTeamMembers} members allowed per team`)
        });
      }
      return teamAdminSchema;
    }
      
    case 'simple':
    case 'adaptive':
    default: {
      if (maxTeamMembers) {
        return teamBaseSchema.extend({
          teamMembers: z.array(teamMemberBaseSchema)
            .min(1, "At least one team member is required")
            .max(maxTeamMembers, `Maximum ${maxTeamMembers} members allowed per team`)
        });
      }
      return teamBaseSchema;
    }
  }
}

/**
 * Get the appropriate team member schema for a given profile
 * 
 * @param profile The form profile
 * @returns Zod schema for team member validation
 */
export function getMemberSchemaForProfile(profile: FormProfile) {
  switch (profile) {
    case 'detailed':
      return teamMemberDetailedSchema;
      
    case 'admin':
      return teamMemberAdminSchema;
      
    case 'simple':
    case 'adaptive':
    default:
      return teamMemberBaseSchema;
  }
}

/**
 * Type inference helper for form data based on profile
 */
export type InferFormData<T extends FormProfile> = 
  T extends 'detailed' ? z.infer<typeof teamDetailedSchema> :
  T extends 'admin' ? z.infer<typeof teamAdminSchema> :
  z.infer<typeof teamBaseSchema>;

/**
 * Validate form data against the appropriate schema
 * 
 * @param data Form data to validate
 * @param profile Form profile to determine validation rules
 * @param maxTeamMembers Optional maximum team members
 * @returns Validation result
 */
export function validateTeamFormData(
  data: unknown, 
  profile: FormProfile, 
  maxTeamMembers?: number
) {
  const schema = createTeamFormSchema(profile, maxTeamMembers);
  return schema.safeParse(data);
}
