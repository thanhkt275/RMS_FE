'use client';

import { useState } from 'react';
import { Plus, Calendar, Trophy, Users, Play, Pause, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Stage, StageStatus } from '@/lib/types/tournament.types';
import { StageQuickCreate } from './stage-quick-create';

interface StagesSectionProps {
  tournamentId: string;
  stages: Stage[];
  detailedStages?: Stage[];
}

const stageStatusConfig = {
  [StageStatus.PENDING]: {
    color: 'bg-gray-100 text-gray-800',
    icon: Calendar,
    label: 'Pending'
  },
  [StageStatus.ACTIVE]: {
    color: 'bg-blue-100 text-blue-800',
    icon: Play,
    label: 'Active'
  },
  [StageStatus.PAUSED]: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Pause,
    label: 'Paused'
  },
  [StageStatus.COMPLETED]: {
    color: 'bg-green-100 text-green-800',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tournament Stages</h2>
          <p className="text-gray-600 mt-1">
            Manage tournament stages and track competition progress
          </p>
        </div>
        <Button onClick={() => setShowCreateStage(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Stage
        </Button>
      </div>

      {/* Stages Grid */}
      {stagesToDisplay.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stagesToDisplay.map((stage) => {
            const statusConfig = stageStatusConfig[stage.status];
            const StatusIcon = statusConfig.icon;
            const progress = getStageProgress(stage);

            return (
              <Card 
                key={stage.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                  selectedStage?.id === stage.id && "ring-2 ring-blue-500"
                )}
                onClick={() => setSelectedStage(stage)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">{stage.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDateRange(stage.startDate, stage.endDate)}
                      </p>
                    </div>
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Stage Description */}
                  {stage.description && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {stage.description}
                    </p>
                  )}

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        {stage._count?.matches || 0} matches
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        {stage.maxTeams || 'Unlimited'} teams
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {stage.status === StageStatus.ACTIVE && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="text-gray-900 font-medium">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {/* Stage-specific badges */}
                  <div className="flex flex-wrap gap-1">
                    {stage.isElimination && (
                      <Badge variant="outline" className="text-xs">
                        Elimination
                      </Badge>
                    )}
                    {stage.advancementRules && (
                      <Badge variant="outline" className="text-xs">
                        Advancement Rules
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle view matches
                      }}
                    >
                      View Matches
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle edit stage
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <Trophy className="h-12 w-12 text-gray-400" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">No stages yet</h3>
              <p className="text-gray-600 mt-1">
                Create your first tournament stage to get started
              </p>
            </div>
            <Button onClick={() => setShowCreateStage(true)}>
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
