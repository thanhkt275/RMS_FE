'use client';

import { useState } from 'react';
import { Plus, Calendar, Trophy, Users, Play, Pause, CheckCircle, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Stage, StageStatus } from '@/types/tournament.types';
import { StageQuickCreate } from './stage-quick-create';

interface StagesSectionProps {
  tournamentId: string;
  stages: Stage[];
  detailedStages?: Stage[];
}

const stageStatusConfig = {
  [StageStatus.PENDING]: {
    color: 'bg-gray-700 text-gray-200',
    icon: Calendar,
    label: 'Pending'
  },
  [StageStatus.ACTIVE]: {
    color: 'bg-blue-800 text-blue-100',
    icon: Play,
    label: 'Active'
  },
  [StageStatus.PAUSED]: {
    color: 'bg-yellow-800 text-yellow-100',
    icon: Pause,
    label: 'Paused'
  },
  [StageStatus.COMPLETED]: {
    color: 'bg-green-800 text-green-100',
    icon: CheckCircle,
    label: 'Completed'
  }
};

export function StagesSection({ tournamentId, stages, detailedStages }: StagesSectionProps) {
  const [showCreateStage, setShowCreateStage] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

  const stagesToDisplay = detailedStages || stages;

  const getStageProgress = (stage: Stage) => {
    if (!stage._count) return 0;
    const total = stage._count.matches || 0;
    const completed = stage._count.completedMatches || 0;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const formatDateRange = (startDate: Date, endDate?: Date) => {
    const start = new Date(startDate).toLocaleDateString();
    const end = endDate ? new Date(endDate).toLocaleDateString() : 'TBD';
    return `${start} - ${end}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tournament Stages</h2>
          <p className="text-sm sm:text-base text-gray-700 mt-1">
            Manage tournament stages and track competition progress
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateStage(true)}
          className="w-full sm:w-auto min-h-[44px] touch-target bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Stage
        </Button>
      </div>

      {/* Stages Grid */}
      {stagesToDisplay.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {stagesToDisplay.map((stage) => {
            const statusConfig = stageStatusConfig[stage.status];
            const StatusIcon = statusConfig.icon;
            const progress = getStageProgress(stage);

            return (
              <Card 
                key={stage.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 bg-gray-800 border-gray-700 active:scale-[0.98]",
                  selectedStage?.id === stage.id && "ring-2 ring-blue-500"
                )}
                onClick={() => setSelectedStage(stage)}
              >
                <CardHeader className="pb-3 p-4 sm:p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg line-clamp-1 text-slate-100">{stage.name}</CardTitle>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        {formatDateRange(stage.startDate, stage.endDate)}
                      </p>
                    </div>
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      <span className="text-xs">{statusConfig.label}</span>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                  {/* Stage Description */}
                  {stage.description && (
                    <p className="text-sm text-slate-300 line-clamp-2">
                      {stage.description}
                    </p>
                  )}

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-400 truncate">
                        {stage._count?.matches || 0} matches
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-400 truncate">
                        {stage.maxTeams || 'Unlimited'} teams
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {stage.status === StageStatus.ACTIVE && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-slate-100 font-medium">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {/* Stage-specific badges */}
                  <div className="flex flex-wrap gap-1">
                    {stage.isElimination && (
                      <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">
                        Elimination
                      </Badge>
                    )}
                    {stage.advancementRules && (
                      <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">
                        Advancement Rules
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-700">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-slate-200 border-slate-500 hover:bg-slate-600 hover:text-white hover:border-slate-400 min-h-[36px] touch-target transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle view matches
                      }}
                    >
                      <Trophy className="h-3 w-3 mr-1 sm:hidden" />
                      View Matches
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="sm:flex-shrink-0 text-slate-200 border-slate-500 hover:bg-slate-600 hover:text-white hover:border-slate-400 min-h-[36px] touch-target transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle edit stage
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1 sm:mr-0 sm:hidden" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-6 sm:p-8 text-center bg-gray-800 border-gray-700">
          <div className="flex flex-col items-center space-y-4 sm:space-y-6">
            <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-slate-600" />
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-medium text-slate-100">No stages yet</h3>
              <p className="text-sm sm:text-base text-slate-400 max-w-md">
                Create your first tournament stage to get started
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateStage(true)}
              className="w-full sm:w-auto min-h-[44px] touch-target bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Stage
            </Button>
          </div>
        </Card>
      )}

      {/* Stage Quick Create Dialog */}
      {showCreateStage && (
        <StageQuickCreate
          tournamentId={tournamentId}
          onClose={() => setShowCreateStage(false)}
        />
      )}
    </div>
  );
}
