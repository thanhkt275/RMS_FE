"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useStageRankings, 
  useStageReadiness, 
  useAdvanceTeams,
  useAdvancementPreview
} from "@/hooks/use-stage-advancement";
import { AdvancementOptions } from "@/types/stage-advancement.types";
import { ReadinessIndicator } from "@/components/stages/readiness-indicator";
import { AdvancementPreview } from "@/components/stages/advancement-preview";
import { AdvancementConfig } from "@/components/stages/advancement-config";
import { RankingsTable } from "@/components/stages/rankings-table";
import { 
  ArrowRight, 
  ArrowLeft, 
  Trophy, 
  Users, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown,
  Target,
  Clock
} from "lucide-react";
import { toast } from "sonner";

interface EndStageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stageId: string;
  stageName: string;
  stageType: string;
  tournamentId: string;
  onAdvancementComplete?: () => void;
}

type DialogStep = "readiness" | "rankings" | "config" | "preview" | "confirm" | "result";

/**
 * Dialog component for ending a stage and advancing teams to the next stage
 * Implements SOLID principles:
 * - Single Responsibility: Orchestrates the stage ending process
 * - Open/Closed: Extensible through composition of smaller components
 * - Liskov Substitution: Uses interfaces for all dependencies
 * - Interface Segregation: Focused props interfaces
 * - Dependency Inversion: Depends on hooks abstraction, not concrete implementations
 */
export default function EndStageDialog({
  isOpen,
  onClose,
  stageId,
  stageName,
  stageType,
  tournamentId,
  onAdvancementComplete,
}: EndStageDialogProps) {
  // State management
  const [currentStep, setCurrentStep] = useState<DialogStep>("readiness");  const [advancementOptions, setAdvancementOptions] = useState<AdvancementOptions>({
    teamsToAdvance: 4,
    createNextStage: true,
    nextStageConfig: {
      name: "",
      type: "PLAYOFF",
      startDate: new Date(),
      endDate: new Date(),
      teamsPerAlliance: 2,
    },
  });
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advancementResult, setAdvancementResult] = useState<any>(null);
  // Custom hooks for data fetching and mutations
  const { 
    data: readinessData, 
    isLoading: readinessLoading, 
    error: readinessError 
  } = useStageReadiness(stageId, isOpen);

  const { 
    data: rankings, 
    isLoading: rankingsLoading, 
    error: rankingsError 
  } = useStageRankings(stageId, isOpen);

  const { 
    data: previewData,
    isLoading: previewLoading,
    error: previewError,
    refetch: refetchPreview
  } = useAdvancementPreview(stageId, advancementOptions.teamsToAdvance, isOpen && currentStep === "preview");

  const advanceTeamsMutation = useAdvanceTeams(stageId);
  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("readiness");
      setAdvancementOptions({
        teamsToAdvance: 4,
        createNextStage: true,
        nextStageConfig: {
          name: getDefaultNextStageName(stageName, stageType),
          type: getDefaultNextStageType(stageType),
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          teamsPerAlliance: 2,
        },
      });
      setIsAdvancing(false);
      setAdvancementResult(null);
    }
  }, [isOpen, stageType, stageName]);
  // Helper functions following Single Responsibility Principle
  const getDefaultNextStageType = (currentType: string): 'SWISS' | 'PLAYOFF' | 'FINAL' => {
    switch (currentType) {
      case "SWISS":
        return "PLAYOFF";
      case "PLAYOFF":
        return "FINAL";
      default:
        return "PLAYOFF";
    }
  };

  const getDefaultNextStageName = (currentName: string, currentType: string): string => {
    switch (currentType) {
      case "SWISS":
        return `${currentName} - Playoffs`;
      case "PLAYOFF":
        return `${currentName} - Finals`;
      default:
        return `${currentName} - Next Stage`;
    }
  };

  const getStepTitle = (step: DialogStep): string => {
    const titles = {
      readiness: "Stage Readiness Check",
      rankings: "Current Rankings",
      config: "Advancement Configuration",
      preview: "Advancement Preview",
      confirm: "Confirm Advancement",
      result: "Advancement Complete"
    };
    return titles[step];
  };

  const getStepDescription = (step: DialogStep): string => {
    const descriptions = {
      readiness: "Verify that the stage is ready for advancement",
      rankings: "Review current team standings and performance",
      config: "Configure how teams will advance to the next stage",
      preview: "Preview which teams will advance with current settings",
      confirm: "Confirm the advancement and create the next stage",
      result: "View the results of the advancement process"
    };
    return descriptions[step];
  };
  const canProceedToNextStep = (): boolean => {
    switch (currentStep) {
      case "readiness":
        return readinessData?.ready === true;
      case "rankings":
        return Boolean(rankings && rankings.length > 0);
      case "config":
        return advancementOptions.teamsToAdvance > 0 && 
               Boolean(advancementOptions.nextStageConfig?.name?.trim());
      case "preview":
        return Boolean(previewData && previewData.length > 0);
      case "confirm":
        return !isAdvancing;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === "config") {
      // Trigger preview data fetch when moving to preview step
      await refetchPreview();
    }
    
    const stepOrder: DialogStep[] = ["readiness", "rankings", "config", "preview", "confirm"];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const stepOrder: DialogStep[] = ["readiness", "rankings", "config", "preview", "confirm"];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };
  const handleAdvanceTeams = async () => {
    try {
      setIsAdvancing(true);
      const result = await advanceTeamsMutation.mutateAsync(advancementOptions);
      
      setAdvancementResult(result);
      setCurrentStep("result");
      toast.success("Teams advanced successfully!");
      
      if (onAdvancementComplete) {
        onAdvancementComplete();
      }
    } catch (error: any) {
      console.error("Failed to advance teams:", error);
      toast.error(`Failed to advance teams: ${error.message}`);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleClose = () => {
    setCurrentStep("readiness");
    setAdvancementResult(null);
    onClose();
  };

  // Component render functions following Single Responsibility Principle
  const renderStepContent = () => {
    switch (currentStep) {
      case "readiness":        return (
          <div className="space-y-4">
            <ReadinessIndicator
              readiness={readinessData || { ready: false, reason: "Loading..." }}
              className=""
            />
            {readinessData && !readinessData.ready && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Stage Not Ready</AlertTitle>
                <AlertDescription>
                  Complete all required matches before advancing teams.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case "rankings":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <h3 className="text-lg font-semibold">Current Team Rankings</h3>
            </div>
            <Separator />
            {rankingsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : rankingsError ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Rankings</AlertTitle>
                <AlertDescription>
                  Failed to load team rankings. Please try again.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[400px]">
                <RankingsTable 
                  rankings={rankings || []} 
                  highlightAdvancing={advancementOptions.teamsToAdvance}
                />
              </ScrollArea>
            )}
          </div>
        );

      case "config":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Advancement Configuration</h3>
            </div>
            <Separator />            <AdvancementConfig
              initialOptions={advancementOptions}
              teamsToAdvance={advancementOptions.teamsToAdvance}
              maxTeams={rankings?.length || 0}
              onOptionsChange={setAdvancementOptions}
            />
          </div>
        );

      case "preview":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Advancement Preview</h3>
            </div>
            <Separator />
            {previewLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : previewError ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Preview Error</AlertTitle>
                <AlertDescription>
                  Failed to generate advancement preview. Please check your configuration.
                </AlertDescription>
              </Alert>
            ) : (              <AdvancementPreview 
                rankings={previewData || []}
                initialTeamsToAdvance={advancementOptions.teamsToAdvance}
                maxTeams={rankings?.length || 0}
                onTeamsToAdvanceChange={(count) => 
                  setAdvancementOptions(prev => ({ ...prev, teamsToAdvance: count }))
                }
              />
            )}
          </div>
        );

      case "confirm":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Confirm Advancement</h3>
            </div>
            <Separator />
            <Alert>
              <Crown className="h-4 w-4" />
              <AlertTitle>Ready to Advance Teams</AlertTitle>              <AlertDescription>
                This will advance {advancementOptions.teamsToAdvance} teams from "{stageName}" 
                to a new "{advancementOptions.nextStageConfig?.name || 'Next Stage'}" stage. This action cannot be undone.
              </AlertDescription>
            </Alert>
            {previewData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Summary:</h4>                <ul className="text-sm space-y-1">
                  <li>• Stage: {stageName} → {advancementOptions.nextStageConfig?.name || 'Next Stage'}</li>
                  <li>• Type: {stageType} → {advancementOptions.nextStageConfig?.type || 'TBD'}</li>
                  <li>• Teams advancing: {advancementOptions.teamsToAdvance}</li>
                  <li>• Create new stage: {advancementOptions.createNextStage ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            )}
          </div>
        );

      case "result":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Advancement Complete</h3>
            </div>
            <Separator />
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                Teams have been successfully advanced to the next stage.
              </AlertDescription>
            </Alert>
            {advancementResult && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Results:</h4>
                <ul className="text-sm space-y-1">
                  <li>• New stage created: {advancementResult.nextStage?.name}</li>
                  <li>• Teams advanced: {advancementResult.advancedTeams?.length || 0}</li>
                  <li>• Next stage type: {advancementResult.nextStage?.type}</li>
                </ul>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: "readiness", label: "Readiness", icon: Clock },
      { key: "rankings", label: "Rankings", icon: Trophy },
      { key: "config", label: "Config", icon: Target },
      { key: "preview", label: "Preview", icon: Users },
      { key: "confirm", label: "Confirm", icon: CheckCircle },
    ];

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => {
          const isActive = currentStep === step.key;
          const isCompleted = steps.slice(0, index).some(s => s.key === currentStep) || 
                             (currentStep === "result" && step.key !== "result");
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full transition-colors
                ${isActive ? 'bg-blue-600 text-white' : 
                  isCompleted ? 'bg-green-600 text-white' : 
                  'bg-gray-200 text-gray-600'}
              `}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="ml-2 text-xs font-medium">
                {step.label}
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFooterButtons = () => {
    const showPrevious = currentStep !== "readiness" && currentStep !== "result";
    const showNext = currentStep !== "confirm" && currentStep !== "result";
    const showConfirm = currentStep === "confirm";
    const showClose = currentStep === "result";

    return (
      <>
        {showPrevious && (
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            className="mr-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
        )}
        
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={handleClose}>
            {showClose ? "Close" : "Cancel"}
          </Button>
          
          {showNext && (
            <Button 
              onClick={handleNext}
              disabled={!canProceedToNextStep()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          
          {showConfirm && (
            <Button 
              onClick={handleAdvanceTeams}
              disabled={isAdvancing || !canProceedToNextStep()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isAdvancing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Advancing...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-1" />
                  Advance Teams
                </>
              )}
            </Button>
          )}
        </div>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            End Stage: {stageName}
          </DialogTitle>
          <DialogDescription>
            {getStepDescription(currentStep)}
          </DialogDescription>
        </DialogHeader>

        {currentStep !== "result" && renderStepIndicator()}

        <ScrollArea className="flex-1 px-1">
          {renderStepContent()}
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between pt-4 border-t">
          {renderFooterButtons()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
