import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings, 
  AlertCircle, 
  RefreshCw, 
  Loader2,
  Calculator,
  Trophy,
  Zap,
  Activity
} from 'lucide-react';

// Import the dynamic scoring panel and hooks
import DynamicScorePanel from '@/components/features/dynamic-scoring/dynamic-score-panel';
import ScoreSection from '@/components/features/dynamic-scoring/score-section';
import { ScoringPanel } from './scoring-panel';
import { useMatchScoreConfig, useScoreConfigCache } from '@/hooks/score-config/use-score-config';
import { ElementScores, AllianceScoreData } from '@/types/score-config.types';

interface IntegratedScoringPanelProps {
  // Legacy scoring props
  selectedMatchId: string;
  isLoading?: boolean;
  disabled?: boolean;
  
  // Legacy scoring control interface
  redAutoScore: number;
  redDriveScore: number;
  blueAutoScore: number;
  blueDriveScore: number;
  redTotalScore: number;
  blueTotalScore: number;
  redPenalty: number;
  bluePenalty: number;
  redGameElements: any[];
  blueGameElements: any[];
  redTeamCount: number;
  blueTeamCount: number;
  redMultiplier: number;
  blueMultiplier: number;
  isAddingRedElement: boolean;
  isAddingBlueElement: boolean;
  
  // Legacy setters
  setRedAutoScore: (score: number) => void;
  setRedDriveScore: (score: number) => void;
  setBlueAutoScore: (score: number) => void;
  setBlueDriveScore: (score: number) => void;
  setIsAddingRedElement: (adding: boolean) => void;
  setIsAddingBlueElement: (adding: boolean) => void;
  setRedPenalty: (score: number) => void;
  setBluePenalty: (score: number) => void;
  
  // Legacy actions
  onUpdateScores: () => void;
  onSubmitScores: () => void;
  addRedGameElement: () => void;
  addBlueGameElement: () => void;
  removeGameElement: (alliance: "red" | "blue", index: number) => void;
  updateRedTeamCount: (count: number) => void;
  updateBlueTeamCount: (count: number) => void;
}

export function IntegratedScoringPanel(props: IntegratedScoringPanelProps) {
  const { selectedMatchId, disabled = false, isLoading = false } = props;
  
  // Add mounted state to fix hydration issues
  const [isMounted, setIsMounted] = useState(false);
  
  // Cache and online status
  const { isOnline, preloadScoreConfig } = useScoreConfigCache();
  
  // Fetch score configuration for this match
  const {
    data: matchScoreConfig,
    isLoading: isLoadingConfig,
    error: configError,
    refetch: refetchConfig
  } = useMatchScoreConfig(selectedMatchId);
  
  // State for dynamic scoring mode
  const [scoringMode, setScoringMode] = useState<'dynamic' | 'legacy'>('legacy');
  const [redElementScores, setRedElementScores] = useState<ElementScores>({});
  const [blueElementScores, setBlueElementScores] = useState<ElementScores>({});
  
  // Set mounted state on client
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Preload config when match ID changes
  useEffect(() => {
    if (selectedMatchId && isOnline) {
      preloadScoreConfig(selectedMatchId);
    }
  }, [selectedMatchId, isOnline, preloadScoreConfig]);
  
  // Determine scoring mode based on config availability
  useEffect(() => {
    if (!isLoadingConfig) {
      // Handle both nested MatchScoreConfig and direct ScoreConfig responses
      const scoreConfig = matchScoreConfig?.scoreConfig || matchScoreConfig;
      console.log('🔍 Raw matchScoreConfig:', matchScoreConfig);
      console.log('🔍 Processed scoreConfig:', scoreConfig);
      
      if (scoreConfig) {
        console.log('🔍 Available properties:', Object.keys(scoreConfig));
        console.log('🔍 scoreSections:', (scoreConfig as any).scoreSections);
        console.log('🔍 scoreElements:', (scoreConfig as any).scoreElements);
      }
      
      // Check for both new (scoreSections) and legacy (scoreElements) structures
      if (scoreConfig && (
        ((scoreConfig as any).scoreSections?.length > 0) || 
        ((scoreConfig as any).scoreElements?.length > 0)
      )) {
        console.log('🎯 Dynamic scoring config found:', scoreConfig);
        setScoringMode('dynamic');
      } else {
        console.log('📝 Using legacy scoring mode - no valid config found');
        setScoringMode('legacy');
      }
    }
  }, [matchScoreConfig, isLoadingConfig]);
  
  // Handlers for dynamic scoring
  const handleRedScoreChange = (scores: ElementScores) => {
    setRedElementScores(scores);
  };
  
  const handleBlueScoreChange = (scores: ElementScores) => {
    setBlueElementScores(scores);
  };
  
  const handleRedSubmit = async (finalScores: AllianceScoreData) => {
    console.log('Red alliance final scores:', finalScores);
    // Here you would integrate with the existing score submission logic
    await props.onSubmitScores();
  };
  
  const handleBlueSubmit = async (finalScores: AllianceScoreData) => {
    console.log('Blue alliance final scores:', finalScores);
    // Here you would integrate with the existing score submission logic
    await props.onSubmitScores();
  };
  
  // Loading state
  if (isLoadingConfig) {
    return (
      <Card className="bg-white border border-gray-200 shadow-lg rounded-xl p-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-900">Loading Scoring Configuration...</h2>
            </div>
            {isMounted && !isOnline && (
              <Badge variant="destructive">Offline</Badge>
            )}
          </div>
          
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 p-6 bg-red-50 rounded-xl">
                    <Skeleton className="h-6 w-32" />
                    {[1, 2, 3].map(j => (
                      <Skeleton key={j} className="h-12 w-full" />
                    ))}
                  </div>
                  <div className="space-y-4 p-6 bg-blue-50 rounded-xl">
                    <Skeleton className="h-6 w-32" />
                    {[1, 2, 3].map(j => (
                      <Skeleton key={j} className="h-12 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }
  
  // Error state with retry (show error banner above the current mode)
  const errorBanner = configError && (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <div className="font-medium">Failed to load scoring configuration</div>
          <div className="text-sm mt-1">
            {configError.message} - Using {scoringMode} scoring mode.
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchConfig()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScoringMode('legacy')}
          >
            Use Legacy
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
  
  // Dynamic scoring mode - transform raw config to expected format
  const actualScoreConfig = matchScoreConfig?.scoreConfig || matchScoreConfig;
  if (scoringMode === 'dynamic' && actualScoreConfig) {
    // Transform the raw ScoreConfig to the expected format
    const config = actualScoreConfig as any;
    const transformedConfig = {
      matchId: selectedMatchId,
      scoreConfigId: config.id,
      sections: config.scoreSections?.length > 0 
        ? config.scoreSections.map((section: any) => ({
            ...section,
            elements: section.scoreElements || [],
            bonuses: section.bonusConditions || [],
            penalties: section.penaltyConditions || []
          }))
        : [
            // Fallback: create a single section from legacy structure
            {
              id: 'main-section',
              name: config.name || 'Main Scoring',
              code: 'main',
              description: config.description,
              displayOrder: 1,
              elements: config.scoreElements || [],
              bonuses: config.bonusConditions || [],
              penalties: config.penaltyConditions || []
            }
          ],
      formula: config.totalScoreFormula || 'total',
      previewMode: false,
      validationRules: []
    };

    return (
      <div>
        {errorBanner}
        <Card className="bg-white border border-gray-200 shadow-lg rounded-xl p-8">
          <div className="space-y-6">
          {/* Header with mode indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="bg-blue-500 text-white">
                <Zap className="w-3 h-3 mr-1" />
                Dynamic Scoring
              </Badge>
              <h2 className="text-2xl font-bold text-gray-900">Match Scoring</h2>
              {isMounted && !isOnline && (
                <Badge variant="destructive">Offline</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchConfig()}
                disabled={isLoadingConfig}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Config
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScoringMode('legacy')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Switch to Legacy
              </Button>
            </div>
          </div>
          
          {!selectedMatchId ? (
            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">No match selected</div>
                <div className="text-sm mt-1">Select a match to begin dynamic scoring</div>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {/* Debug info */}
              <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                Config: {config.name} | Sections: {transformedConfig.sections.length}
              </div>
              
              {/* Score Sections - Render directly here instead of using DynamicScorePanel */}
              {transformedConfig.sections.map((section: any) => (
                <ScoreSection
                  key={section.id}
                  section={section}
                  scores={redElementScores}
                  onScoreChange={(elementCode: string, value: number) => {
                    const newScores = { ...redElementScores, [elementCode]: value };
                    setRedElementScores(newScores);
                    handleRedScoreChange(newScores);
                  }}
                  disabled={disabled || (isMounted && !isOnline)}
                  readonly={false}
                  allianceColor="RED"
                />
              ))}
            </div>
          )}
          </div>
        </Card>
      </div>
    );
  }
  
  // Legacy scoring mode (fallback)
  return (
    <div>
      {errorBanner}
      <div className="space-y-4">
      {/* Header with mode indicator */}
      <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-orange-500 text-orange-700">
            <Activity className="w-3 h-3 mr-1" />
            Legacy Scoring
          </Badge>
          <div>
            <div className="font-medium text-orange-800">
              Using legacy scoring mode
            </div>
            <div className="text-sm text-orange-600">
              No dynamic score configuration found for this tournament
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isMounted && isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchConfig();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check for Dynamic Config
            </Button>
          )}
        </div>
      </div>
      
        {/* Legacy Scoring Panel */}
        <ScoringPanel {...props} />
      </div>
    </div>
  );
}
