'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Trophy,
  Settings,
  Eye,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Zap,
  Info,
  Loader2,
  RefreshCw,
  Target,
} from 'lucide-react';
import { Tournament } from '@/types/tournament.types';
import { ScoreConfig } from '@/types/score-config';
import { useScoreConfig } from '@/hooks/score-config/useScoreConfigs';
import { useScoreConfigByTournamentId } from '@/hooks/score-config/useScoreConfigs';
import { ScorePreviewPanel } from '@/components/features/score-config/ScorePreviewPanel';
import { toast } from 'sonner';

interface ScoreConfigManagementProps {
  tournament: Tournament;
  onUpdate?: () => void;
}

interface ValidationWarning {
  type: 'warning' | 'error' | 'info';
  message: string;
  details?: string;
}

export function ScoreConfigManagement({ tournament, onUpdate }: ScoreConfigManagementProps) {
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<ScoreConfig | null>(null);

  // Fetch all available score configs
  const { data: allConfigs = [], isLoading: configsLoading } = useScoreConfig();
  
  // Fetch currently assigned score config
  const { 
    data: currentConfig, 
    isLoading: currentConfigLoading,
    refetch: refetchCurrentConfig 
  } = useScoreConfigByTournamentId(tournament.id);

  // Handle assignment mutation
  const { assign: assignConfig } = useScoreConfig();

  // Validate config compatibility
  const validateConfigCompatibility = (config: ScoreConfig): ValidationWarning[] => {
    const warnings: ValidationWarning[] = [];

    // Check if config has sections
    if (!config.scoreSections || config.scoreSections.length === 0) {
      warnings.push({
        type: 'error',
        message: 'No score sections defined',
        details: 'This configuration does not have any score sections and cannot be used for scoring.',
      });
    }

    // Check if sections have elements
    const sectionsWithoutElements = config.scoreSections?.filter(
      section => !section.scoreElements || section.scoreElements.length === 0
    ) || [];

    if (sectionsWithoutElements.length > 0) {
      warnings.push({
        type: 'warning',
        message: `${sectionsWithoutElements.length} section(s) have no elements`,
        details: 'Sections without elements will not contribute to scoring.',
      });
    }

    // Check if formula is defined when there are multiple sections
    if (config.scoreSections && config.scoreSections.length > 1 && !config.totalScoreFormula) {
      warnings.push({
        type: 'warning',
        message: 'No custom formula defined',
        details: 'Multiple sections found but no custom formula. Scores will be summed by default.',
      });
    }

    // Check tournament date compatibility
    const now = new Date();
    const tournamentStart = new Date(tournament.startDate);
    
    if (tournamentStart < now) {
      warnings.push({
        type: 'info',
        message: 'Tournament has already started',
        details: 'Changing score configuration for an active tournament may affect existing match scores.',
      });
    }

    // Check if config is already assigned to another tournament
    if (config.tournamentId && config.tournamentId !== tournament.id) {
      warnings.push({
        type: 'warning',
        message: 'Configuration is assigned to another tournament',
        details: 'This configuration is currently being used by another tournament.',
      });
    }

    return warnings;
  };

  const handleAssignConfig = async () => {
    if (!selectedConfigId) return;

    try {
      await assignConfig.mutateAsync({
        configId: selectedConfigId,
        tournamentIds: [tournament.id],
      });

      toast.success('Score Configuration Assigned', {
        description: 'The score configuration has been successfully assigned to this tournament.',
      });

      setIsAssignDialogOpen(false);
      setSelectedConfigId('');
      refetchCurrentConfig();
      onUpdate?.();
    } catch (error) {
      toast.error('Assignment Failed', {
        description: 'Failed to assign score configuration. Please try again.',
      });
    }
  };

  const handlePreviewConfig = (config: ScoreConfig) => {
    setPreviewConfig(config);
    setIsPreviewDialogOpen(true);
  };

  const openScoringPanel = () => {
    if (currentConfig) {
      // Open scoring panel in new tab with current config
      window.open(`/control-match?scoreConfigId=${currentConfig.id}`, '_blank');
    }
  };

  const selectedConfig = allConfigs.find(config => config.id === selectedConfigId);
  const validationWarnings = selectedConfig ? validateConfigCompatibility(selectedConfig) : [];
  const hasErrors = validationWarnings.some(w => w.type === 'error');

  if (configsLoading || currentConfigLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Score Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading score configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Score Configuration
            </div>
            <div className="flex items-center gap-2">
              {currentConfig && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openScoringPanel}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview in Scoring Panel
                </Button>
              )}
              <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    {currentConfig ? 'Change Configuration' : 'Assign Configuration'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Assign Score Configuration</DialogTitle>
                    <DialogDescription>
                      Select a score configuration to use for matches in this tournament.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Available Configurations
                      </label>
                      <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a score configuration" />
                        </SelectTrigger>
                        <SelectContent>
                          {allConfigs.map((config) => (
                            <SelectItem key={config.id} value={config.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{config.name}</span>
                                {config.tournamentId && config.tournamentId !== tournament.id && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    In Use
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedConfig && (
                      <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h4 className="font-medium text-sm mb-2">{selectedConfig.name}</h4>
                          {selectedConfig.description && (
                            <p className="text-sm text-gray-600 mb-2">{selectedConfig.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{selectedConfig.scoreSections?.length || 0} sections</span>
                            <span>
                              {selectedConfig.scoreSections?.reduce(
                                (total, section) => total + (section.scoreElements?.length || 0),
                                0
                              ) || 0} elements
                            </span>
                            <span>{selectedConfig.bonusConditions?.length || 0} bonuses</span>
                            <span>{selectedConfig.penaltyConditions?.length || 0} penalties</span>
                          </div>
                        </div>

                        {/* Validation Warnings */}
                        {validationWarnings.length > 0 && (
                          <div className="space-y-2">
                            {validationWarnings.map((warning, index) => (
                              <Alert
                                key={index}
                                variant={warning.type === 'error' ? 'destructive' : 'default'}
                                className={
                                  warning.type === 'warning'
                                    ? 'border-yellow-200 bg-yellow-50'
                                    : warning.type === 'info'
                                    ? 'border-blue-200 bg-blue-50'
                                    : ''
                                }
                              >
                                {warning.type === 'error' && <AlertTriangle className="h-4 w-4" />}
                                {warning.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                                {warning.type === 'info' && <Info className="h-4 w-4 text-blue-600" />}
                                <AlertDescription>
                                  <div className="font-medium text-sm">{warning.message}</div>
                                  {warning.details && (
                                    <div className="text-xs mt-1 opacity-90">{warning.details}</div>
                                  )}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewConfig(selectedConfig)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview Configuration
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAssignConfig}
                      disabled={!selectedConfigId || hasErrors || assignConfig.isPending}
                    >
                      {assignConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Assign Configuration
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentConfig ? (
            <div className="space-y-4">
              {/* Current Config Display */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">{currentConfig.name}</span>
                    </div>
                    {currentConfig.description && (
                      <p className="text-sm text-green-700">{currentConfig.description}</p>
                    )}
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    Active
                  </Badge>
                </div>

                {/* Configuration Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="text-center p-3 bg-white rounded border border-green-200">
                    <div className="text-lg font-bold text-green-700">
                      {currentConfig.scoreSections?.length || 0}
                    </div>
                    <div className="text-xs text-green-600">Sections</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border border-green-200">
                    <div className="text-lg font-bold text-green-700">
                      {currentConfig.scoreSections?.reduce(
                        (total, section) => total + (section.scoreElements?.length || 0),
                        0
                      ) || 0}
                    </div>
                    <div className="text-xs text-green-600">Elements</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border border-green-200">
                    <div className="text-lg font-bold text-green-700">
                      {currentConfig.bonusConditions?.length || 0}
                    </div>
                    <div className="text-xs text-green-600">Bonuses</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded border border-green-200">
                    <div className="text-lg font-bold text-green-700">
                      {currentConfig.penaltyConditions?.length || 0}
                    </div>
                    <div className="text-xs text-green-600">Penalties</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-green-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewConfig(currentConfig)}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Configuration
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/score-config`, '_blank')}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Configuration
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Score Configuration Assigned
              </h3>
              <p className="text-gray-600 mb-4">
                This tournament needs a score configuration to enable match scoring.
              </p>
              <Alert variant="default" className="border-yellow-200 bg-yellow-50 mb-4">
                <Info className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  Without a score configuration, referees will not be able to score matches
                  for this tournament. Please assign a configuration before the tournament begins.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Score Configuration Preview
            </DialogTitle>
            <DialogDescription>
              {previewConfig?.name} - Preview how this configuration will work in practice
            </DialogDescription>
          </DialogHeader>

          {previewConfig && (
            <ScorePreviewPanel
              config={{
                totalScoreFormula: previewConfig.totalScoreFormula,
                scoreSections: previewConfig.scoreSections,
                bonusConditions: previewConfig.bonusConditions,
                penaltyConditions: previewConfig.penaltyConditions,
              }}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Close Preview
            </Button>
            {previewConfig && (
              <Button
                variant="outline"
                onClick={() => window.open(`/score-config`, '_blank')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Configuration
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
