import { z } from 'zod';

/**
 * Base validation schema for team member
 * Contains the minimum required fields for any team member
 */
export const teamMemberBaseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Full name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  role: z.string().optional(),
});

/**
 * Detailed validation schema for team member
 * Includes all additional fields for comprehensive registration
 */
export const teamMemberDetailedSchema = teamMemberBaseSchema.extend({
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  phoneNumber: z.string().optional(),
  province: z.string().min(1, "Province is required"),
  ward: z.string().min(1, "District is required"),
  organization: z.string().optional(),
  organizationAddress: z.string().optional(),
  dateOfBirth: z.string().refine((val) => {
    const dob = new Date(val);
    if (isNaN(dob.getTime())) return false;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const hasHadBirthdayThisYear =
      today.getMonth() > dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

    if (!hasHadBirthdayThisYear) {
      age -= 1;
    }

    return age >= 10 && age <= 18;
  }, {
    message: "Age must be between 10 and 18 years",
  }),
});

/**
 * Admin validation schema for team member
 * Simplified validation for admin quick entry
 */
export const teamMemberAdminSchema = teamMemberBaseSchema.extend({
  // Admin schema allows some fields to be optional that are required in detailed mode
  role: z.string().min(1, "Role is required"),
});

/**
 * Base team validation schema
 * Core fields required for any team registration
 */
export const teamBaseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Team name must be at least 2 characters").max(100, "Name too long"),
  description: z.string().optional(),
  teamMembers: z.array(teamMemberBaseSchema).min(1, "At least one team member is required"),
});

/**
 * Detailed team validation schema
 * Extended validation for comprehensive registration
 */
export const teamDetailedSchema = teamBaseSchema.extend({
  teamMembers: z.array(teamMemberDetailedSchema).min(1, "At least one team member is required"),
  referralSource: z.string().min(1, "Please select how you heard about us"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

/**
 * Admin team validation schema
 * Simplified validation for admin use
 */
export const teamAdminSchema = teamBaseSchema.extend({
  teamNumber: z.coerce.number().int().min(1, "Team number must be positive"),
  teamMembers: z.array(teamMemberAdminSchema).min(1, "At least one team member is required"),
});
