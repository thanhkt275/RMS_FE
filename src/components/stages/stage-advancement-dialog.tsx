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
  useAdvanceTeams 
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
  AlertTriangle 
} from "lucide-react";
import { toast } from "sonner";

interface StageAdvancementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stageId: string;
  stageName: string;
  tournamentId: string;
}

type DialogStep = "readiness" | "preview" | "config" | "confirm" | "result";

/**
 * Main dialog component for stage advancement
 * Implements proper separation of concerns by using smaller, focused components
 */
export default function StageAdvancementDialog({
  isOpen,
  onClose,
  stageId,
  stageName,
  tournamentId,
}: StageAdvancementDialogProps) {
  
  // State management
  const [currentStep, setCurrentStep] = useState<DialogStep>("readiness");
  const [teamsToAdvance, setTeamsToAdvance] = useState<number>(0);
  const [advancementOptions, setAdvancementOptions] = useState<AdvancementOptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Data fetching hooks
  const { 
    data: rankings = [], 
    isLoading: rankingsLoading, 
    error: rankingsError 
  } = useStageRankings(stageId, isOpen);

  const { 
    data: readiness, 
    isLoading: readinessLoading, 
    error: readinessError 
  } = useStageReadiness(stageId, isOpen);

  // Mutation hook
  const advanceTeamsMutation = useAdvanceTeams(stageId);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("readiness");
      setTeamsToAdvance(Math.ceil(rankings.length / 2));
      setAdvancementOptions(null);
      setError(null);
    }
  }, [isOpen, rankings.length]);

  // Auto-advance to preview if stage is ready
  useEffect(() => {
    if (readiness?.ready && currentStep === "readiness" && rankings.length > 0) {
      setTeamsToAdvance(Math.ceil(rankings.length / 2));
      // Don't auto-advance, let user click next
    }
  }, [readiness, currentStep, rankings.length]);

  // Error handling
  const hasError = rankingsError || readinessError || error;
  const errorMessage = rankingsError?.message || readinessError?.message || error;

  // Loading state
  const isLoading = rankingsLoading || readinessLoading || advanceTeamsMutation.isPending;

  // Navigation helpers
  const canProceedFromReadiness = readiness?.ready && rankings.length > 0;
  const canProceedFromPreview = teamsToAdvance > 0 && teamsToAdvance <= rankings.length;
  const canProceedFromConfig = advancementOptions !== null;

  const goToNextStep = () => {
    switch (currentStep) {
      case "readiness":
        if (canProceedFromReadiness) setCurrentStep("preview");
        break;
      case "preview":
        if (canProceedFromPreview) setCurrentStep("config");
        break;
      case "config":
        if (canProceedFromConfig) setCurrentStep("confirm");
        break;
      case "confirm":
        handleAdvanceTeams();
        break;
      default:
        break;
    }
  };

  const goToPreviousStep = () => {
    switch (currentStep) {
      case "preview":
        setCurrentStep("readiness");
        break;
      case "config":
        setCurrentStep("preview");
        break;
      case "confirm":
        setCurrentStep("config");
        break;
      case "result":
        onClose();
        break;
      default:
        break;
    }
  };

  const handleAdvanceTeams = async () => {
    if (!advancementOptions) {
      setError("Please configure advancement options");
      return;
    }

    try {
      setError(null);
      const result = await advanceTeamsMutation.mutateAsync(advancementOptions);
      setCurrentStep("result");
    } catch (error: any) {
      setError(error.message || "Failed to advance teams");
      toast.error(`Failed to advance teams: ${error.message}`);
    }
  };

  // Step titles and descriptions
  const getStepInfo = () => {
    switch (currentStep) {
      case "readiness":
        return {
          title: "Stage Readiness Check",
          description: `Verify that ${stageName} is ready for team advancement`,
        };
      case "preview":
        return {
          title: "Preview Advancement",
          description: "Select how many teams will advance to the next stage",
        };
      case "config":
        return {
          title: "Configure Next Stage",
          description: "Set up where advancing teams will compete next",
        };
      case "confirm":
        return {
          title: "Confirm Advancement",
          description: "Review and confirm the advancement details",
        };
      case "result":
        return {
          title: "Advancement Complete",
          description: "Teams have been successfully advanced",
        };
      default:
        return { title: "", description: "" };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] bg-white border border-gray-200 rounded-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900">{stepInfo.title}</DialogTitle>
          <DialogDescription className="text-gray-600">
            {stepInfo.description}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center space-x-2 py-2">
          {["readiness", "preview", "config", "confirm", "result"].map((step, index) => {
            const isActive = currentStep === step;
            const isCompleted = ["readiness", "preview", "config", "confirm", "result"].indexOf(currentStep) > index;
            
            return (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                  ${isActive ? 'bg-blue-500 text-white' : 
                    isCompleted ? 'bg-green-500 text-white' : 
                    'bg-gray-200 text-gray-600'}
                `}>
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                </div>
                {index < 4 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error display */}
        {hasError && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        )}

        {/* Step content */}
        {!isLoading && (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-6">
              
              {/* Step 1: Readiness Check */}
              {currentStep === "readiness" && readiness && (
                <ReadinessIndicator readiness={readiness} />
              )}

              {/* Step 2: Preview Advancement */}
              {currentStep === "preview" && rankings.length > 0 && (
                <AdvancementPreview
                  rankings={rankings}
                  initialTeamsToAdvance={teamsToAdvance}
                  maxTeams={rankings.length}
                  onTeamsToAdvanceChange={setTeamsToAdvance}
                />
              )}

              {/* Step 3: Configure Advancement */}
              {currentStep === "config" && (
                <AdvancementConfig
                  teamsToAdvance={teamsToAdvance}
                  maxTeams={rankings.length}
                  onOptionsChange={setAdvancementOptions}
                />
              )}

              {/* Step 4: Confirm Advancement */}
              {currentStep === "confirm" && advancementOptions && (
                <div className="space-y-6">
                  <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Confirm Advancement</AlertTitle>
                    <AlertDescription>
                      This action cannot be undone. Please review the details below before proceeding.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">Advancement Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Teams advancing:</span>
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            {teamsToAdvance}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Teams eliminated:</span>
                          <Badge variant="outline" className="border-red-300 text-red-600">
                            {rankings.length - teamsToAdvance}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current stage:</span>
                          <span className="font-medium">{stageName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">Next Stage</h4>
                      <div className="space-y-2 text-sm">
                        {advancementOptions.createNextStage ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Action:</span>
                              <span className="font-medium">Create new stage</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Name:</span>
                              <span className="font-medium">{advancementOptions.nextStageConfig?.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Type:</span>
                              <Badge variant="outline">{advancementOptions.nextStageConfig?.type}</Badge>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Existing stage:</span>
                            <span className="font-medium">{advancementOptions.nextStageId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <RankingsTable 
                    rankings={rankings.slice(0, 10)} 
                    highlightAdvancing={teamsToAdvance}
                  />
                  
                  {rankings.length > 10 && (
                    <div className="text-center text-sm text-gray-600">
                      ... and {rankings.length - 10} more teams
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Result */}
              {currentStep === "result" && (
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Teams Advanced Successfully!
                    </h3>
                    <p className="text-gray-600">
                      {teamsToAdvance} teams have been advanced from {stageName} to the next stage.
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm text-green-800">
                      <div className="font-medium mb-2">What happens next:</div>
                      <ul className="text-left space-y-1">
                        <li>• Advanced teams are now in the next stage</li>
                        <li>• Current stage is marked as completed</li>
                        <li>• Team rankings have been updated</li>
                        <li>• Eliminated teams remain in tournament records</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Footer with navigation */}
        <DialogFooter className="gap-2">
          {currentStep !== "readiness" && currentStep !== "result" && (
            <Button 
              variant="outline" 
              onClick={goToPreviousStep}
              disabled={isLoading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}

          {currentStep === "readiness" && (
            <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 rounded-lg">
              Cancel
            </Button>
          )}

          {currentStep === "result" ? (
            <Button onClick={onClose} className="bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200">
              Close
            </Button>
          ) : (
            <Button
              onClick={goToNextStep}
              disabled={
                isLoading ||
                (currentStep === "readiness" && !canProceedFromReadiness) ||
                (currentStep === "preview" && !canProceedFromPreview) ||
                (currentStep === "config" && !canProceedFromConfig)
              }
              className="bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                  {currentStep === "confirm" ? "Advancing..." : "Loading..."}
                </>
              ) : (
                <>
                  {currentStep === "confirm" ? "Advance Teams" : "Next"}
                  {currentStep !== "confirm" && <ArrowRight className="h-4 w-4 ml-1" />}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
