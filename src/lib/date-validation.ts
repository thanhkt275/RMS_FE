import { z } from 'zod';
import { format, isAfter, isBefore, differenceInHours, differenceInDays } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface HierarchicalDateValidationOptions {
  parentRange?: DateRange;
  childRanges?: DateRange[];
  allowPartialOverlap?: boolean;
  minDurationHours?: number;
  maxDurationHours?: number;
  entityName?: string;
  parentName?: string;
}

/**
 * Validates that a date range falls within a parent date range
 */
export const validateDateRangeWithinParent = (
  childRange: DateRange,
  parentRange: DateRange,
  entityName: string = 'entity',
  parentName: string = 'parent'
): DateValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (isBefore(childRange.startDate, parentRange.startDate)) {
    errors.push(
      `${entityName} start date cannot be before ${parentName} start date (${format(parentRange.startDate, 'PPP')})`
    );
  }

  if (isAfter(childRange.endDate, parentRange.endDate)) {
    errors.push(
      `${entityName} end date cannot be after ${parentName} end date (${format(parentRange.endDate, 'PPP')})`
    );
  }

  // Warning if dates are very close to boundaries
  const startBuffer = differenceInHours(childRange.startDate, parentRange.startDate);
  const endBuffer = differenceInHours(parentRange.endDate, childRange.endDate);

  if (startBuffer < 1 && startBuffer >= 0) {
    warnings.push(`${entityName} starts very close to ${parentName} start time`);
  }

  if (endBuffer < 1 && endBuffer >= 0) {
    warnings.push(`${entityName} ends very close to ${parentName} end time`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validates duration constraints
 */
export const validateDateRangeDuration = (
  range: DateRange,
  minHours?: number,
  maxHours?: number,
  entityName: string = 'entity'
): DateValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const durationHours = differenceInHours(range.endDate, range.startDate);

  if (minHours && durationHours < minHours) {
    errors.push(
      `${entityName} duration must be at least ${minHours} hours (current: ${durationHours.toFixed(1)} hours)`
    );
  }

  if (maxHours && durationHours > maxHours) {
    errors.push(
      `${entityName} duration cannot exceed ${maxHours} hours (current: ${durationHours.toFixed(1)} hours)`
    );
  }

  // Warnings for very short or very long durations
  if (durationHours < 1) {
    warnings.push(`${entityName} duration is very short (${Math.round(durationHours * 60)} minutes)`);
  }

  if (durationHours > 24 * 7) {
    warnings.push(`${entityName} duration is very long (${Math.round(durationHours / 24)} days)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Comprehensive hierarchical date validation
 */
export const validateHierarchicalDateRange = (
  range: DateRange,
  options: HierarchicalDateValidationOptions = {}
): DateValidationResult => {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Basic range validation
  if (!isBefore(range.startDate, range.endDate)) {
    allErrors.push('Start date must be before end date');
  }

  // Parent range validation
  if (options.parentRange) {
    const parentValidation = validateDateRangeWithinParent(
      range, 
      options.parentRange,
      options.entityName,
      options.parentName
    );
    allErrors.push(...parentValidation.errors);
    allWarnings.push(...parentValidation.warnings);
  }

  // Duration validation
  if (options.minDurationHours || options.maxDurationHours) {
    const durationValidation = validateDateRangeDuration(
      range, 
      options.minDurationHours, 
      options.maxDurationHours,
      options.entityName
    );
    allErrors.push(...durationValidation.errors);
    allWarnings.push(...durationValidation.warnings);
  }

  // Child ranges validation
  if (options.childRanges && options.childRanges.length > 0) {
    for (const childRange of options.childRanges) {
      const childValidation = validateDateRangeWithinParent(
        childRange, 
        range, 
        'Child entity', 
        options.entityName || 'Current entity'
      );
      if (!childValidation.isValid) {
        allErrors.push(...childValidation.errors);
      }
      allWarnings.push(...childValidation.warnings);
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
};

/**
 * Creates a Zod schema for hierarchical date validation
 */
export const createHierarchicalDateSchema = (
  options: HierarchicalDateValidationOptions = {}
) => {
  return z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }).refine(
    (data) => {
      const validation = validateHierarchicalDateRange(data, options);
      return validation.isValid;
    },
    (data) => {
      const validation = validateHierarchicalDateRange(data, options);
      return {
        message: validation.errors.join('; '),
        path: ['endDate'] as const,
      };
    }
  );
};

/**
 * Tournament-specific date validation schema
 */
export const createTournamentDateSchema = (existingStages?: DateRange[]) => {
  return createHierarchicalDateSchema({
    childRanges: existingStages,
    minDurationHours: 1,
    maxDurationHours: 24 * 30 * 6, // 6 months
    entityName: 'Tournament',
  });
};

/**
 * Stage-specific date validation schema
 */
export const createStageeDateSchema = (
  tournamentRange?: DateRange,
  existingMatches?: DateRange[]
) => {
  return createHierarchicalDateSchema({
    parentRange: tournamentRange,
    childRanges: existingMatches,
    minDurationHours: 0.5,
    maxDurationHours: 24 * 7, // 1 week
    entityName: 'Stage',
    parentName: 'Tournament',
  });
};

/**
 * Match-specific date validation schema
 */
export const createMatchDateSchema = (stageRange?: DateRange) => {
  return createHierarchicalDateSchema({
    parentRange: stageRange,
    minDurationHours: 0.1, // 6 minutes minimum
    maxDurationHours: 4, // 4 hours maximum
    entityName: 'Match',
    parentName: 'Stage',
  });
};

/**
 * Utility to get date boundary warnings for UI display
 */
export const getDateBoundaryWarnings = (
  range: DateRange,
  parentRange?: DateRange
): string[] => {
  const warnings: string[] = [];
  const now = new Date();

  // Check if dates are in the past
  if (isBefore(range.startDate, now)) {
    warnings.push('Start date is in the past');
  }

  // Check proximity to parent boundaries
  if (parentRange) {
    const startBuffer = differenceInHours(range.startDate, parentRange.startDate);
    const endBuffer = differenceInHours(parentRange.endDate, range.endDate);

    if (startBuffer < 1 && startBuffer >= 0) {
      warnings.push('Start date is very close to parent start boundary');
    }

    if (endBuffer < 1 && endBuffer >= 0) {
      warnings.push('End date is very close to parent end boundary');
    }
  }

  return warnings;
};

/**
 * Utility to format date validation errors for user display
 */
export const formatDateValidationErrors = (
  result: DateValidationResult,
  includeWarnings: boolean = true
): string[] => {
  const messages: string[] = [...result.errors];
  
  if (includeWarnings && result.warnings.length > 0) {
    messages.push(...result.warnings.map(warning => `Warning: ${warning}`));
  }
  
  return messages;
};

/**
 * Check if a date range update would affect existing child entities
 */
export const checkDateRangeUpdateImpact = (
  currentRange: DateRange,
  newRange: DateRange,
  childRanges: DateRange[]
): {
  hasImpact: boolean;
  affectedChildren: number;
  impactType: 'shrinking' | 'expanding' | 'shifting';
} => {
  let affectedChildren = 0;
  
  for (const childRange of childRanges) {
    const currentlyValid = validateDateRangeWithinParent(childRange, currentRange, '', '').isValid;
    const willBeValid = validateDateRangeWithinParent(childRange, newRange, '', '').isValid;
    
    if (currentlyValid && !willBeValid) {
      affectedChildren++;
    }
  }

  const isExpanding = isBefore(newRange.startDate, currentRange.startDate) || 
                     isAfter(newRange.endDate, currentRange.endDate);
  const isShrinking = isAfter(newRange.startDate, currentRange.startDate) || 
                     isBefore(newRange.endDate, currentRange.endDate);

  let impactType: 'shrinking' | 'expanding' | 'shifting' = 'shifting';
  if (isExpanding && !isShrinking) impactType = 'expanding';
  if (isShrinking && !isExpanding) impactType = 'shrinking';

  return {
    hasImpact: affectedChildren > 0,
    affectedChildren,
    impactType
  };
};
