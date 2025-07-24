import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Calculator, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  Settings,
  Trophy
} from 'lucide-react';
import ScoreSection from './score-section';
import { 
  useScorePanelConfig, 
  useScoreCalculation,
  useScoreConfigCache
} from '@/hooks/score-config/use-score-config';
import { 
  DynamicScorePanelProps, 
  ElementScores,
  AllianceScoreData 
} from '@/types/score-config.types';
import { useAuth } from '@/hooks/common/use-auth';
import { UserRole } from '@/types/user.types';

const DynamicScorePanel: React.FC<DynamicScorePanelProps> = ({
  matchId,
  allianceColor,
  onScoreChange,
  onSubmit,
  disabled = false,
  readonly = false
}) => {
  const { user } = useAuth();
  const { isOnline } = useScoreConfigCache();
  
  // Determine alliance ID (this would be provided by the parent component normally)
  const [allianceId, setAllianceId] = useState<string | null>(null);
  
  // Fetch score panel configuration
  const {
    data: panelConfig,
    isLoading: isLoadingConfig,
    error: configError,
    refetch: refetchConfig
  } = useScorePanelConfig(matchId);

  // Score calculation and submission
  const {
    elementScores,
    setElementScores,
    calculationResult,
    isCalculating,
    calculationError,
    submitScore,
    isSubmitting,
    submitError,
    submitSuccess
  } = useScoreCalculation(matchId, allianceId);

  // Local state for score tracking
  const [localScores, setLocalScores] = useState<ElementScores>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Color classes for alliance theming
  const colorClasses = {
    RED: {
      background: 'bg-red-50',
      border: 'border-red-200',
      header: 'bg-red-100 border-red-200',
      headerText: 'text-red-800',
      accent: 'text-red-600',
      button: 'bg-red-500 hover:bg-red-600 text-white'
    },
    BLUE: {
      background: 'bg-blue-50',
      border: 'border-blue-200',
      header: 'bg-blue-100 border-blue-200',
      headerText: 'text-blue-800',
      accent: 'text-blue-600',
      button: 'bg-blue-500 hover:bg-blue-600 text-white'
    }
  };

  const colors = colorClasses[allianceColor];

  // Check user permissions
  const canScore = useMemo(() => {
    if (!user) return false;
    return [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE].includes(user.role);
  }, [user]);

  const isDisabled = disabled || readonly || !canScore || !isOnline;

  // Initialize scores when config loads
  useEffect(() => {
    if (panelConfig && panelConfig.sections) {
      const initialScores: ElementScores = {};
      panelConfig.sections.forEach(section => {
        section.elements.forEach(element => {
          initialScores[element.code] = 0;
        });
      });
      setLocalScores(initialScores);
      setElementScores(initialScores);
    }
  }, [panelConfig, setElementScores]);

  // Handle score changes
  const handleScoreChange = (elementCode: string, value: number) => {
    const newScores = { ...localScores, [elementCode]: value };
    setLocalScores(newScores);
    setElementScores(newScores);
    setHasUnsavedChanges(true);
    onScoreChange(newScores);
  };

  // Handle score submission
  const handleSubmit = async () => {
    if (!calculationResult) return;

    const allianceScoreData: AllianceScoreData = {
      sectionScores: calculationResult.sectionScores,
      totalScore: calculationResult.totalScore
    };

    try {
      await submitScore(allianceScoreData);
      setHasUnsavedChanges(false);
      onSubmit(allianceScoreData);
    } catch (error) {
      console.error('Failed to submit scores:', error);
    }
  };

  // Loading state
  if (isLoadingConfig) {
    return (
      <Card className={`p-6 ${colors.background} ${colors.border}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(j => (
                    <Skeleton key={j} className="h-32 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Error state
  if (configError) {
    return (
      <Card className={`p-6 ${colors.background} ${colors.border}`}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load score configuration: {configError.message}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchConfig()}
              className="ml-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  // No configuration available (fallback to legacy scoring)
  if (!panelConfig || !panelConfig.sections || panelConfig.sections.length === 0) {
    return (
      <Card className={`p-6 ${colors.background} ${colors.border}`}>
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            No score configuration found for this tournament. Using legacy scoring mode.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  // Sort sections by display order
  const sortedSections = [...panelConfig.sections].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-6">
      {/* Panel Header */}
      <Card className={`p-4 ${colors.header}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`${colors.headerText} border-current`}>
              {allianceColor} Alliance
            </Badge>
            <h2 className={`text-xl font-bold ${colors.headerText}`}>
              Dynamic Scoring Panel
            </h2>
            {!isOnline && (
              <Badge variant="destructive">Offline</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isCalculating && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating...
              </div>
            )}
            {calculationResult && (
              <div className="text-right">
                <div className={`text-2xl font-bold ${colors.accent}`}>
                  {calculationResult.totalScore} pts
                </div>
                <div className="text-xs text-gray-500">Total Score</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Score Sections */}
      <div className="space-y-6">
        {sortedSections.map((section) => (
          <ScoreSection
            key={section.id}
            section={section}
            scores={localScores}
            onScoreChange={handleScoreChange}
            disabled={isDisabled}
            readonly={readonly}
            allianceColor={allianceColor}
          />
        ))}
      </div>

      {/* Calculation Results */}
      {calculationResult && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Score Calculation</h3>
            </div>
            
            {/* Applied Bonuses */}
            {calculationResult.appliedBonuses?.some(b => b.triggered) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-green-600">Applied Bonuses</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {calculationResult.appliedBonuses
                    .filter(bonus => bonus.triggered)
                    .map(bonus => (
                      <div key={bonus.bonusId} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm font-medium">{bonus.bonusName}</span>
                        <span className="text-sm text-green-600">+{bonus.points} pts</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Applied Penalties */}
            {calculationResult.appliedPenalties?.some(p => p.triggered) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-600">Applied Penalties</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {calculationResult.appliedPenalties
                    .filter(penalty => penalty.triggered)
                    .map(penalty => (
                      <div key={penalty.penaltyId} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                        <span className="text-sm font-medium">{penalty.penaltyName}</span>
                        <span className="text-sm text-red-600">-{penalty.points} pts</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Calculation Errors */}
            {calculationResult.errors && calculationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {calculationResult.errors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      {!readonly && canScore && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Unsaved Changes
                </Badge>
              )}
              {submitSuccess && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Scores saved successfully</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => refetchConfig()}
                disabled={isLoadingConfig}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Config
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={isDisabled || isSubmitting || !calculationResult}
                className={`flex items-center gap-2 ${colors.button}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Submit Scores
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Submission Error */}
          {submitError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to submit scores: {submitError.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Calculation Error */}
          {calculationError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Score calculation error: {calculationError.message}
              </AlertDescription>
            </Alert>
          )}
        </Card>
      )}
    </div>
  );
};

export default DynamicScorePanel;
