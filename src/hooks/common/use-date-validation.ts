import { useState, useEffect, useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { z } from 'zod';
import { 
  DateRange, 
  DateValidationResult,
  validateHierarchicalDateRange,
  HierarchicalDateValidationOptions,
  getDateBoundaryWarnings,
  checkDateRangeUpdateImpact
} from '@/lib/date-validation';

export interface UseDateValidationOptions extends HierarchicalDateValidationOptions {
  validateOnChange?: boolean;
  debounceMs?: number;
}

export interface DateValidationState {
  result: DateValidationResult;
  isValidating: boolean;
  hasValidated: boolean;
}

/**
 * Hook for real-time date validation with hierarchical constraints
 */
export function useDateValidation(
  dateRange: Partial<DateRange>,
  options: UseDateValidationOptions = {}
) {
  const [validationState, setValidationState] = useState<DateValidationState>({
    result: { isValid: true, errors: [], warnings: [] },
    isValidating: false,
    hasValidated: false
  });

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const validateRange = useMemo(() => {
    return (range: DateRange) => {
      setValidationState(prev => ({ ...prev, isValidating: true }));
      
      const result = validateHierarchicalDateRange(range, options);
      
      setValidationState({
        result,
        isValidating: false,
        hasValidated: true
      });
      
      return result;
    };
  }, [options]);

  useEffect(() => {
    if (!options.validateOnChange || !dateRange.startDate || !dateRange.endDate) {
      return;
    }

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for debounced validation
    const timer = setTimeout(() => {
      validateRange({
        startDate: dateRange.startDate!,
        endDate: dateRange.endDate!
      });
    }, options.debounceMs || 300);

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [dateRange.startDate, dateRange.endDate, validateRange, options.validateOnChange, options.debounceMs]);

  const validateNow = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return validateRange({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
    }
    return { isValid: false, errors: ['Both start and end dates are required'], warnings: [] };
  };

  const getImpactAnalysis = (newRange: DateRange) => {
    if (!dateRange.startDate || !dateRange.endDate || !options.childRanges) {
      return null;
    }

    const currentRange = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    };

    return checkDateRangeUpdateImpact(currentRange, newRange, options.childRanges);
  };

  return {
    ...validationState,
    validateNow,
    getImpactAnalysis,
    hasErrors: validationState.result.errors.length > 0,
    hasWarnings: validationState.result.warnings.length > 0,
    isComplete: !!(dateRange.startDate && dateRange.endDate)
  };
}

/**
 * Hook for tournament date validation
 */
export function useTournamentDateValidation(
  dateRange: Partial<DateRange>,
  existingStages?: DateRange[]
) {
  return useDateValidation(dateRange, {
    childRanges: existingStages,
    minDurationHours: 1,
    maxDurationHours: 24 * 30 * 6, // 6 months
    entityName: 'Tournament',
    validateOnChange: true,
    debounceMs: 500
  });
}

/**
 * Hook for stage date validation
 */
export function useStageDateValidation(
  dateRange: Partial<DateRange>,
  tournamentRange?: DateRange,
  existingMatches?: DateRange[]
) {
  return useDateValidation(dateRange, {
    parentRange: tournamentRange,
    childRanges: existingMatches,
    minDurationHours: 0.5,
    maxDurationHours: 24 * 7, // 1 week
    entityName: 'Stage',
    parentName: 'Tournament',
    validateOnChange: true,
    debounceMs: 300
  });
}

/**
 * Hook for match date validation
 */
export function useMatchDateValidation(
  dateRange: Partial<DateRange>,
  stageRange?: DateRange
) {
  return useDateValidation(dateRange, {
    parentRange: stageRange,
    minDurationHours: 0.1, // 6 minutes
    maxDurationHours: 4, // 4 hours
    entityName: 'Match',
    parentName: 'Stage',
    validateOnChange: true,
    debounceMs: 200
  });
}

/**
 * Utility hook to get formatted date boundaries for display
 */
export function useDateBoundaryInfo(parentRange?: DateRange) {
  return useMemo(() => {
    if (!parentRange) return null;

    return {
      startDate: format(parentRange.startDate, 'PPP'),
      endDate: format(parentRange.endDate, 'PPP'),
      startDateTime: format(parentRange.startDate, 'PPP p'),
      endDateTime: format(parentRange.endDate, 'PPP p'),
      duration: `${differenceInDays(parentRange.endDate, parentRange.startDate)} days`,
      isActive: new Date() >= parentRange.startDate && new Date() <= parentRange.endDate,
      isPast: new Date() > parentRange.endDate,
      isFuture: new Date() < parentRange.startDate
    };
  }, [parentRange]);
}

/**
 * Creates Zod schemas with hierarchical validation for forms
 */
export const createFormDateValidationSchema = (
  options: HierarchicalDateValidationOptions = {}
) => {
  return z.object({
    startDate: z.string().refine((date: string) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Invalid start date'),
    endDate: z.string().refine((date: string) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Invalid end date'),
  }).refine((data: { startDate: string; endDate: string }) => {
    const range = {
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate)
    };
    
    const validation = validateHierarchicalDateRange(range, options);
    return validation.isValid;
  }, (data: { startDate: string; endDate: string }) => {
    const range = {
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate)
    };
    
    const validation = validateHierarchicalDateRange(range, options);
    return {
      message: validation.errors.join('; '),
      path: ['endDate'] as const,
    };
  });
};
