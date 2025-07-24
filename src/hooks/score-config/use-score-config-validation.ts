"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import { ScoreConfig, ScoreSection, ScoreElement } from "../../types/score-config";
import type { ScoreCalculationResult } from "../../types/score-config.types";
import { ElementType as CalculationElementType } from "../../types/score-config.types";
import { apiClient } from "../../lib/api-client";
import { scoreCalculationEngine } from "./score-calculation";

// Validation error types
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning' | 'info';
  suggestions?: string[];
}

export interface CompatibilityCheck {
  isCompatible: boolean;
  issues: ValidationError[];
  score: number; // 0-100 compatibility score
}

// API functions for validation
const validationApi = {
  async validateScoreConfig(config: Partial<ScoreConfig>): Promise<ValidationError[]> {
    const response = await apiClient.post('/score-configs/validate', config);
    return response;
  },

  async checkTournamentCompatibility(
    configId: string, 
    tournamentId: string
  ): Promise<CompatibilityCheck> {
    const response = await apiClient.get(
      `/score-configs/${configId}/compatibility/${tournamentId}`
    );
    return response;
  },

  async previewScoreConfig(
    config: Partial<ScoreConfig>,
    sampleData?: Record<string, number>
  ): Promise<any> {
    const response = await apiClient.post('/score-configs/preview', {
      config,
      sampleData,
    });
    return response;
  },

  async getConfigurationSuggestions(
    tournamentType?: string,
    gameType?: string
  ): Promise<ScoreConfig[]> {
    // Build query string from parameters
    const searchParams = new URLSearchParams();
    if (tournamentType) {
      searchParams.append('tournamentType', tournamentType);
    }
    if (gameType) {
      searchParams.append('gameType', gameType);
    }
    
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/score-configs/suggestions?${queryString}` : '/score-configs/suggestions';
    
    const response = await apiClient.get(endpoint);
    return response;
  },
};

/**
 * Hook for comprehensive score config validation
 */
export function useScoreConfigValidation() {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Client-side validation
  const validateClientSide = useCallback((config: Partial<ScoreConfig>): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Basic structure validation
    if (!config.name || config.name.trim().length === 0) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Configuration name is required',
        field: 'name',
        severity: 'error',
        suggestions: ['Provide a descriptive name for this configuration'],
      });
    }

    if (config.name && config.name.length > 100) {
      errors.push({
        code: 'NAME_TOO_LONG',
        message: 'Configuration name must be less than 100 characters',
        field: 'name',
        severity: 'error',
      });
    }

    // Score sections validation
    if (!config.scoreSections || config.scoreSections.length === 0) {
      errors.push({
        code: 'NO_SECTIONS',
        message: 'At least one score section is required',
        field: 'scoreSections',
        severity: 'error',
        suggestions: [
          'Add an Auto section for autonomous scoring',
          'Add a Teleop section for driver-controlled scoring',
        ],
      });
    } else {
      config.scoreSections.forEach((section, sectionIndex) => {
        if (!section.name || section.name.trim().length === 0) {
          errors.push({
            code: 'MISSING_SECTION_NAME',
            message: `Section ${sectionIndex + 1} is missing a name`,
            field: `scoreSections[${sectionIndex}].name`,
            severity: 'error',
          });
        }

        if (!section.scoreElements || section.scoreElements.length === 0) {
          errors.push({
            code: 'SECTION_NO_ELEMENTS',
            message: `Section "${section.name || 'Unnamed'}" has no score elements`,
            field: `scoreSections[${sectionIndex}].scoreElements`,
            severity: 'warning',
            suggestions: ['Add at least one scoring element to this section'],
          });
        } else {
          section.scoreElements.forEach((element, elementIndex) => {
            if (!element.name || element.name.trim().length === 0) {
              errors.push({
                code: 'MISSING_ELEMENT_NAME',
                message: `Element ${elementIndex + 1} in section "${section.name}" is missing a name`,
                field: `scoreSections[${sectionIndex}].scoreElements[${elementIndex}].name`,
                severity: 'error',
              });
            }

            if (!element.code || element.code.trim().length === 0) {
              errors.push({
                code: 'MISSING_ELEMENT_CODE',
                message: `Element "${element.name}" is missing a code`,
                field: `scoreSections[${sectionIndex}].scoreElements[${elementIndex}].code`,
                severity: 'error',
                suggestions: ['Use a short, unique identifier like "AUTO_MOBILITY"'],
              });
            }

            if (element.pointsPerUnit === undefined || element.pointsPerUnit < 0) {
              errors.push({
                code: 'INVALID_POINTS',
                message: `Element "${element.name}" has invalid points per unit`,
                field: `scoreSections[${sectionIndex}].scoreElements[${elementIndex}].pointsPerUnit`,
                severity: 'error',
              });
            }

            if (element.maxUnits !== undefined && element.maxUnits < 0) {
              errors.push({
                code: 'INVALID_MAX_UNITS',
                message: `Element "${element.name}" has invalid maximum units`,
                field: `scoreSections[${sectionIndex}].scoreElements[${elementIndex}].maxUnits`,
                severity: 'warning',
              });
            }
          });
        }
      });

      // Check for duplicate element codes
      const allCodes = config.scoreSections
        .flatMap(section => section.scoreElements || [])
        .map(element => element.code)
        .filter(Boolean);
      
      const duplicateCodes = allCodes.filter((code, index) => allCodes.indexOf(code) !== index);
      
      duplicateCodes.forEach(code => {
        errors.push({
          code: 'DUPLICATE_ELEMENT_CODE',
          message: `Duplicate element code: "${code}"`,
          field: 'scoreElements.code',
          severity: 'error',
          suggestions: ['Ensure all element codes are unique across the configuration'],
        });
      });
    }

    // Formula validation
    if (config.totalScoreFormula && config.scoreSections) {
      const sectionCodes = config.scoreSections.map(s => s.code).filter(Boolean);
      const formula = config.totalScoreFormula;

      // Check if formula references non-existent sections
      const formulaTokens = formula.match(/[A-Z_]+/g) || [];
      const invalidTokens = formulaTokens.filter(token => !sectionCodes.includes(token));

      invalidTokens.forEach(token => {
        errors.push({
          code: 'INVALID_FORMULA_REFERENCE',
          message: `Formula references unknown section: "${token}"`,
          field: 'totalScoreFormula',
          severity: 'error',
          suggestions: [`Available sections: ${sectionCodes.join(', ')}`],
        });
      });

      // Check if all sections are used in formula
      const unusedSections = sectionCodes.filter(code => !formula.includes(code));
      if (unusedSections.length > 0) {
        errors.push({
          code: 'UNUSED_SECTIONS',
          message: `Formula doesn't use all sections: ${unusedSections.join(', ')}`,
          field: 'totalScoreFormula',
          severity: 'info',
          suggestions: ['Consider including all sections in your formula'],
        });
      }
    }

    // Bonus conditions validation
    config.bonusConditions?.forEach((condition, index) => {
      if (!condition.name || condition.name.trim().length === 0) {
        errors.push({
          code: 'MISSING_BONUS_NAME',
          message: `Bonus condition ${index + 1} is missing a name`,
          field: `bonusConditions[${index}].name`,
          severity: 'error',
        });
      }

      if (condition.bonusPoints === undefined || condition.bonusPoints <= 0) {
        errors.push({
          code: 'INVALID_BONUS_POINTS',
          message: `Bonus condition "${condition.name}" has invalid points`,
          field: `bonusConditions[${index}].bonusPoints`,
          severity: 'error',
        });
      }
    });

    // Penalty conditions validation
    config.penaltyConditions?.forEach((condition, index) => {
      if (!condition.name || condition.name.trim().length === 0) {
        errors.push({
          code: 'MISSING_PENALTY_NAME',
          message: `Penalty condition ${index + 1} is missing a name`,
          field: `penaltyConditions[${index}].name`,
          severity: 'error',
        });
      }

      if (condition.penaltyPoints === undefined || condition.penaltyPoints <= 0) {
        errors.push({
          code: 'INVALID_PENALTY_POINTS',
          message: `Penalty condition "${condition.name}" has invalid points`,
          field: `penaltyConditions[${index}].penaltyPoints`,
          severity: 'error',
        });
      }
    });

    return errors;
  }, []);

  // Server-side validation
  const validateServerSide = useMutation({
    mutationFn: validationApi.validateScoreConfig,
    onMutate: () => setIsValidating(true),
    onSettled: () => setIsValidating(false),
    onSuccess: (serverErrors) => {
      setValidationErrors(prev => [...prev, ...serverErrors]);
    },
  });

  // Combined validation
  const validateConfig = useCallback(async (config: Partial<ScoreConfig>) => {
    setValidationErrors([]);
    setIsValidating(true);

    // Run client-side validation immediately
    const clientErrors = validateClientSide(config);
    setValidationErrors(clientErrors);

    // Run server-side validation if no critical client errors
    const criticalErrors = clientErrors.filter(e => e.severity === 'error');
    if (criticalErrors.length === 0) {
      try {
        await validateServerSide.mutateAsync(config);
      } catch (error) {
        console.error('Server validation failed:', error);
      }
    }

    setIsValidating(false);
  }, [validateClientSide, validateServerSide]);

  // Get validation summary
  const validationSummary = useMemo(() => {
    const errorCount = validationErrors.filter(e => e.severity === 'error').length;
    const warningCount = validationErrors.filter(e => e.severity === 'warning').length;
    const infoCount = validationErrors.filter(e => e.severity === 'info').length;

    return {
      isValid: errorCount === 0,
      hasWarnings: warningCount > 0,
      hasInfo: infoCount > 0,
      errorCount,
      warningCount,
      infoCount,
      totalIssues: validationErrors.length,
    };
  }, [validationErrors]);

  return {
    validationErrors,
    validationSummary,
    isValidating,
    validateConfig,
    validateClientSide,
    clearValidation: () => setValidationErrors([]),
  };
}

/**
 * Hook for checking tournament compatibility
 */
export function useTournamentCompatibility() {
  return useMutation({
    mutationFn: ({ configId, tournamentId }: { configId: string; tournamentId: string }) =>
      validationApi.checkTournamentCompatibility(configId, tournamentId),
    
    onSuccess: (result) => {
      if (!result.isCompatible) {
        console.warn('Compatibility issues found:', result.issues);
      }
    },
  });
}

/**
 * Hook for score config preview functionality
 */
export function useScoreConfigPreview() {
  const [previewData, setPreviewData] = useState<any>(null);
  const [sampleScores, setSampleScores] = useState<Record<string, number>>({});

  const previewMutation = useMutation({
    mutationFn: ({ config, sampleData }: { 
      config: Partial<ScoreConfig>; 
      sampleData?: Record<string, number>;
    }) => validationApi.previewScoreConfig(config, sampleData),
    
    onSuccess: (result) => {
      setPreviewData(result);
    },
  });

  // Generate sample data for preview
  const generateSampleData = useCallback((config: Partial<ScoreConfig>) => {
    const sampleData: Record<string, number> = {};
    
    config.scoreSections?.forEach(section => {
      section.scoreElements?.forEach(element => {
        if (element.code) {
          // Generate reasonable sample values based on element type
          const maxValue = element.maxUnits || 10;
          sampleData[element.code] = Math.floor(Math.random() * maxValue) + 1;
        }
      });
    });

    setSampleScores(sampleData);
    return sampleData;
  }, []);

  // Client-side preview calculation
  const calculatePreview = useCallback((config: Partial<ScoreConfig>, scores?: Record<string, number>) => {
    if (!config.scoreSections) return null;

    try {
      // Convert ScoreSection[] to SectionConfig[] for the calculation engine
      const convertedSections = config.scoreSections.map(section => ({
        id: section.id,
        name: section.name,
        code: section.code,
        displayOrder: section.displayOrder,
        elements: section.scoreElements?.map(element => ({
          id: element.id,
          name: element.name,
          code: element.code,
          elementType: element.elementType as CalculationElementType,
          pointsPerUnit: element.pointsPerUnit,
          displayOrder: element.displayOrder || 0,
          icon: element.icon,
          color: element.color,
          maxValue: element.maxUnits,
          minValue: 0,
        })) || [],
        bonuses: [], // Empty for now - bonuses are handled at config level
        penalties: [] // Empty for now - penalties are handled at config level
      }));

      const result = scoreCalculationEngine.calculateScores(
        convertedSections,
        scores || sampleScores,
        config.totalScoreFormula
      );
      
      setPreviewData(result);
      return result;
    } catch (error) {
      console.error('Preview calculation failed:', error);
      return null;
    }
  }, [sampleScores]);

  return {
    previewData,
    sampleScores,
    setSampleScores,
    generateSampleData,
    calculatePreview,
    previewConfig: previewMutation.mutate,
    isPreviewLoading: previewMutation.isPending,
    previewError: previewMutation.error,
  };
}

/**
 * Hook for getting configuration suggestions
 */
export function useConfigurationSuggestions(tournamentType?: string, gameType?: string) {
  return useQuery({
    queryKey: ['score-config-suggestions', tournamentType, gameType],
    queryFn: () => validationApi.getConfigurationSuggestions(tournamentType, gameType),
    enabled: !!tournamentType || !!gameType,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for comprehensive score config management with validation
 */
export function useEnhancedScoreConfig(configId?: string) {
  const queryClient = useQueryClient();
  const validation = useScoreConfigValidation();
  const preview = useScoreConfigPreview();
  const compatibility = useTournamentCompatibility();

  // Enhanced save mutation with validation
  const saveMutation = useMutation({
    mutationFn: async (config: Partial<ScoreConfig>) => {
      // Validate before saving
      const clientErrors = validation.validateClientSide(config);
      const criticalErrors = clientErrors.filter(e => e.severity === 'error');
      
      if (criticalErrors.length > 0) {
        throw new Error(`Cannot save configuration with ${criticalErrors.length} error(s)`);
      }

      // Save to server
      if (configId) {
        return apiClient.patch(`/score-configs/${configId}`, config);
      } else {
        return apiClient.post('/score-configs', config);
      }
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['score-configs'] });
      if (configId) {
        queryClient.invalidateQueries({ queryKey: ['score-config', configId] });
      }
    },
  });

  // Auto-validation on config changes
  const validateAndPreview = useCallback(async (config: Partial<ScoreConfig>) => {
    // Validate the configuration
    await validation.validateConfig(config);
    
    // Generate preview if valid
    if (validation.validationSummary.isValid) {
      const sampleData = preview.generateSampleData(config);
      preview.calculatePreview(config, sampleData);
    }
  }, [validation, preview]);

  return {
    // Validation
    ...validation,
    
    // Preview
    ...preview,
    
    // Compatibility
    checkCompatibility: compatibility.mutate,
    compatibilityResult: compatibility.data,
    isCheckingCompatibility: compatibility.isPending,
    
    // Save
    saveConfig: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    saveSuccess: saveMutation.isSuccess,
    
    // Combined operations
    validateAndPreview,
  };
}
