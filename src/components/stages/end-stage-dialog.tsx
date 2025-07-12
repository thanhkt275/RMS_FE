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
      case "readiness":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Stage Readiness Check</h3>
                <p className="text-gray-600">Verify that the stage is ready for advancement</p>
              </div>
            </div>
            
            <ReadinessIndicator
              readiness={readinessData || { ready: false, reason: "Loading..." }}
              className=""
            />
            
            {readinessData && !readinessData.ready && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertTitle className="text-red-800 font-semibold">Stage Not Ready</AlertTitle>
                <AlertDescription className="text-red-700">
                  Complete all required matches before advancing teams.
                </AlertDescription>
              </Alert>
            )}
            
            {readinessData && readinessData.ready && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertTitle className="text-green-800 font-semibold">Stage Ready for Advancement</AlertTitle>
                <AlertDescription className="text-green-700">
                  All matches are completed and teams are ready to advance to the next stage.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case "rankings":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Current Team Rankings</h3>
                <p className="text-gray-600">Review current team standings and performance</p>
              </div>
            </div>
            
            {rankingsLoading ? (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Loading team rankings...</p>
                </div>
              </div>
            ) : rankingsError ? (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
                <AlertTitle className="text-red-800 font-semibold">Error Loading Rankings</AlertTitle>
                <AlertDescription className="text-red-700">
                  Failed to load team rankings. Please try again.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <ScrollArea className="h-[400px] lg:h-[450px]">
                  <RankingsTable 
                    rankings={rankings || []} 
                    highlightAdvancing={advancementOptions.teamsToAdvance}
                  />
                </ScrollArea>
              </div>
            )}
          </div>
        );

      case "config":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Advancement Configuration</h3>
                <p className="text-gray-600">Configure how teams will advance to the next stage</p>
              </div>
            </div>
            
            <AdvancementConfig
              initialOptions={advancementOptions}
              teamsToAdvance={advancementOptions.teamsToAdvance}
              maxTeams={rankings?.length || 0}
              onOptionsChange={setAdvancementOptions}
            />
          </div>
        );

      case "preview":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Advancement Preview</h3>
                <p className="text-gray-600">Preview which teams will advance with current settings</p>
              </div>
            </div>
            
            {previewLoading ? (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Generating advancement preview...</p>
                </div>
              </div>
            ) : previewError ? (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
                <AlertTitle className="text-red-800 font-semibold">Preview Error</AlertTitle>
                <AlertDescription className="text-red-700">
                  Failed to generate advancement preview. Please check your configuration.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <AdvancementPreview 
                  rankings={previewData || []}
                  initialTeamsToAdvance={advancementOptions.teamsToAdvance}
                  maxTeams={rankings?.length || 0}
                  onTeamsToAdvanceChange={(count) => 
                    setAdvancementOptions(prev => ({ ...prev, teamsToAdvance: count }))
                  }
                />
              </div>
            )}
          </div>
        );

      case "confirm":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Confirm Advancement</h3>
                <p className="text-gray-600">Confirm the advancement and create the next stage</p>
              </div>
            </div>
            
            <Alert className="border-blue-200 bg-blue-50">
              <Crown className="h-5 w-5 text-blue-600" />
              <AlertTitle className="text-blue-800 font-semibold">Ready to Advance Teams</AlertTitle>
              <AlertDescription className="text-blue-700">
                This will advance {advancementOptions.teamsToAdvance} teams from "{stageName}" 
                to a new "{advancementOptions.nextStageConfig?.name || 'Next Stage'}" stage. This action cannot be undone.
              </AlertDescription>
            </Alert>
            
            {previewData && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Advancement Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Current Stage:</span>
                      <span className="font-medium text-gray-900">{stageName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Next Stage:</span>
                      <span className="font-medium text-gray-900">{advancementOptions.nextStageConfig?.name || 'Next Stage'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Stage Type:</span>
                      <span className="font-medium text-gray-900">{stageType} → {advancementOptions.nextStageConfig?.type || 'TBD'}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Teams Advancing:</span>
                      <span className="font-medium text-green-600">{advancementOptions.teamsToAdvance}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Teams Eliminated:</span>
                      <span className="font-medium text-red-600">{(rankings?.length || 0) - advancementOptions.teamsToAdvance}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Create New Stage:</span>
                      <span className="font-medium text-gray-900">{advancementOptions.createNextStage ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="space-y-3 md:col-span-2 lg:col-span-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Teams:</span>
                      <span className="font-medium text-gray-900">{rankings?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Advancement Rate:</span>
                      <span className="font-medium text-blue-600">{Math.round((advancementOptions.teamsToAdvance / (rankings?.length || 1)) * 100)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Stage Status:</span>
                      <span className="font-medium text-green-600">Ready to Advance</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "result":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Advancement Complete</h3>
                <p className="text-gray-600">View the results of the advancement process</p>
              </div>
            </div>
            
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-800 font-semibold">Success!</AlertTitle>
              <AlertDescription className="text-green-700">
                Teams have been successfully advanced to the next stage.
              </AlertDescription>
            </Alert>
            
            {advancementResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Advancement Results
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">New Stage Created:</span>
                      <span className="font-medium text-green-900">{advancementResult.nextStage?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Stage Type:</span>
                      <span className="font-medium text-green-900">{advancementResult.nextStage?.type}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Stage ID:</span>
                      <span className="font-medium text-green-900 font-mono text-sm">{advancementResult.nextStage?.id}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Teams Advanced:</span>
                      <span className="font-medium text-green-900">{advancementResult.advancedTeams?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Advancement Date:</span>
                      <span className="font-medium text-green-900">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Status:</span>
                      <span className="font-medium text-green-900">Completed</span>
                    </div>
                  </div>
                  <div className="space-y-3 md:col-span-2 lg:col-span-1">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Advancement Time:</span>
                      <span className="font-medium text-green-900">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Success Rate:</span>
                      <span className="font-medium text-green-900">100%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Next Action:</span>
                      <span className="font-medium text-green-900">Schedule Matches</span>
                    </div>
                  </div>
                </div>
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
      { key: "readiness", label: "Readiness", icon: Clock, description: "Check stage completion" },
      { key: "rankings", label: "Rankings", icon: Trophy, description: "Review team standings" },
      { key: "config", label: "Configuration", icon: Target, description: "Set advancement options" },
      { key: "preview", label: "Preview", icon: Users, description: "Review advancing teams" },
      { key: "confirm", label: "Confirm", icon: CheckCircle, description: "Final confirmation" },
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          {steps.map((step, index) => {
            const isActive = currentStep === step.key;
            const isCompleted = currentStep === "result" || 
                               steps.findIndex(s => s.key === currentStep) > index;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center flex-1 min-w-0">
                <div className="flex items-center w-full">
                  <div className={`
                    flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 border-2 flex-shrink-0
                    ${isActive 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110' 
                      : isCompleted 
                        ? 'bg-green-600 border-green-600 text-white shadow-md' 
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                    }
                  `}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      flex-1 h-1 mx-4 transition-colors duration-200
                      ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
                <div className="mt-3 text-center min-w-0">
                  <div className={`
                    text-sm font-semibold transition-colors duration-200 truncate
                    ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}
                  `}>
                    {step.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 hidden lg:block truncate">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFooterButtons = () => {
    const showPrevious = currentStep !== "readiness" && currentStep !== "result";
    const showNext = currentStep !== "confirm" && currentStep !== "result";
    const showConfirm = currentStep === "confirm";
    const showClose = currentStep === "result";

    return (
      <div className="flex items-center justify-between w-full">
        {showPrevious && (
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
        )}
        
        <div className="flex gap-3 ml-auto">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="px-6 py-3 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 rounded-lg transition-all duration-200"
          >
            {showClose ? "Close" : "Cancel"}
          </Button>
          
          {showNext && (
            <Button 
              onClick={handleNext}
              disabled={!canProceedToNextStep()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          
          {showConfirm && (
            <Button 
              onClick={handleAdvanceTeams}
              disabled={isAdvancing || !canProceedToNextStep()}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-400 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isAdvancing ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                  Advancing...
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5" />
                  Advance Teams
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] bg-white border border-gray-200 shadow-2xl rounded-2xl flex flex-col">
        <DialogHeader className="pb-6 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <Crown className="h-5 w-5 text-blue-600" />
            </div>
            End Stage: {stageName}
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-base">
            {getStepDescription(currentStep)}
          </DialogDescription>
        </DialogHeader>

        {currentStep !== "result" && (
          <div className="flex-shrink-0">
            {renderStepIndicator()}
          </div>
        )}

        <div className="flex-1 overflow-hidden min-h-[400px] max-h-[60vh]">
          <ScrollArea className="h-full">
            <div className="px-1 py-4">
              {renderStepContent()}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between pt-6 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 flex-shrink-0">
          {renderFooterButtons()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
