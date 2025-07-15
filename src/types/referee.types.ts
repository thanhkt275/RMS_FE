import type { FieldReferee } from './tournament.types';

export interface RefereeAssignment {
  userId: string;
  isHeadRef: boolean;
}

export interface BatchRefereeAssignment {
  fieldId: string;
  userId: string;
  isHeadRef: boolean;
}

export interface AssignRefereesDto {
  referees: RefereeAssignment[];
}

export interface BatchAssignRefereesDto {
  assignments: BatchRefereeAssignment[];
}

export interface AvailableReferee {
  id: string;
  username: string;
  email: string;
  role: 'HEAD_REFEREE' | 'ALLIANCE_REFEREE';
}

export interface FieldRefereeWithDetails extends FieldReferee {
  field: {
    id: string;
    name: string;
    number: number;
  };
}

// Re-export from tournament types for convenience
export type { FieldReferee } from './tournament.types';
