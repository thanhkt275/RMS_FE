'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  MapPin, 
  User, 
  Trophy, 
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  Settings
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import { Tournament } from '@/types/tournament.types';
import { useScoreConfigByTournamentId } from '@/hooks/score-config/useScoreConfigs';

interface TournamentDetailSummaryProps {
  tournament: Tournament;
  onEdit?: () => void;
  isEditing?: boolean;
}

export function TournamentDetailSummary({ 
  tournament, 
  onEdit, 
  isEditing = false 
}: TournamentDetailSummaryProps) {
  const now = new Date();
  const startDate = new Date(tournament.startDate);
  const endDate = new Date(tournament.endDate);
  
  const getStatusInfo = () => {
    if (isBefore(now, startDate)) {
      return {
        status: 'upcoming',
        label: 'Upcoming',
        description: `Starts ${formatDistanceToNow(startDate, { addSuffix: true })}`,
        icon: <Clock className="h-4 w-4" />,
        variant: 'outline' as const,
        color: 'text-blue-600',
      };
    } else if (isAfter(now, endDate)) {
      return {
        status: 'completed',
        label: 'Completed',
        description: `Ended ${formatDistanceToNow(endDate, { addSuffix: true })}`,
        icon: <CheckCircle className="h-4 w-4" />,
        variant: 'secondary' as const,
        color: 'text-gray-600',
      };
    } else {
      return {
        status: 'active',
        label: 'Active',
        description: `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`,
        icon: <Target className="h-4 w-4" />,
        variant: 'default' as const,
        color: 'text-green-600',
      };
    }
  };

  const statusInfo = getStatusInfo();

  const getDurationText = () => {
    const duration = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(duration / (1000 * 60 * 60 * 24));
    
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.ceil(days / 7)} week${Math.ceil(days / 7) > 1 ? 's' : ''}`;
    return `${Math.ceil(days / 30)} month${Math.ceil(days / 30) > 1 ? 's' : ''}`;
  };

  const { data: scoreConfig, isLoading: scoreConfigLoading } = useScoreConfigByTournamentId(tournament.id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">{tournament.name}</CardTitle>
              <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                {statusInfo.icon}
                {statusInfo.label}
              </Badge>
            </div>
            <p className={`text-sm ${statusInfo.color}`}>
              {statusInfo.description}
            </p>
          </div>
          
          {onEdit && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onEdit}
              disabled={isEditing}
            >
              {isEditing ? 'Editing...' : 'Edit'}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Description */}
        {tournament.description && (
          <div>
            <p className="text-gray-700 leading-relaxed">
              {tournament.description}
            </p>
          </div>
        )}
        {/* Score Config */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2 text-slate-100">
              <Trophy className="h-4 w-4 text-yellow-400" />
              Score Configuration
            </h3>
            {scoreConfig && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`/control-match?scoreConfigId=${scoreConfig.id}`, '_blank')}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 h-7 px-2"
                >
                  <Target className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/score-config', '_blank')}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 h-7 px-2"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Manage
                </Button>
              </div>
            )}
          </div>
          {scoreConfigLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-slate-300"></div>
              <p className="text-slate-300 text-sm">Loading score config...</p>
            </div>
          ) : scoreConfig ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="text-base font-medium text-white">{scoreConfig.name}</div>
                  {scoreConfig.description && (
                    <div className="text-sm text-slate-300">{scoreConfig.description}</div>
                  )}
                </div>
                <Badge className="bg-green-600 text-green-100 border-green-500 ml-2">
                  Active
                </Badge>
              </div>
              
              {/* Score Config Stats */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-700">
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-400">
                    {scoreConfig.scoreSections?.length || 0}
                  </div>
                  <div className="text-xs text-slate-400">Sections</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">
                    {scoreConfig.scoreSections?.reduce(
                      (total, section) => total + (section.scoreElements?.length || 0),
                      0
                    ) || 0}
                  </div>
                  <div className="text-xs text-slate-400">Elements</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">
                    {scoreConfig.bonusConditions?.length || 0}
                  </div>
                  <div className="text-xs text-slate-400">Bonuses</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-400">
                    {scoreConfig.penaltyConditions?.length || 0}
                  </div>
                  <div className="text-xs text-slate-400">Penalties</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <p className="text-slate-300 text-sm">No score config assigned to this tournament.</p>
              </div>
              <div className="text-xs text-slate-400">
                Matches cannot be scored without a configuration.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/tournaments/${tournament.id}#scoring`, '_self')}
                className="mt-2 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Assign Score Config
              </Button>
            </div>
          )}
        </div>
        {/* Key Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Schedule */}
          <div className="space-y-4 bg-gray-900 rounded-lg p-4">
            <h3 className="font-semibold flex items-center gap-2 text-slate-100">
              <Calendar className="h-4 w-4 text-blue-400" />
              Schedule
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Start Date</span>
                <span className="text-sm font-medium text-white">
                  {format(startDate, 'PPP')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">End Date</span>
                <span className="text-sm font-medium text-white">
                  {format(endDate, 'PPP')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Duration</span>
                <Badge variant="outline" className="text-xs text-slate-100 border-slate-400">
                  {getDurationText()}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Tournament Details */}
          <div className="space-y-4 bg-gray-900 rounded-lg p-4">
            <h3 className="font-semibold flex items-center gap-2 text-slate-100">
              <Info className="h-4 w-4 text-cyan-300" />
              Details
            </h3>
            <div className="space-y-3">
              {tournament.location && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-200" />
                    Location
                  </span>
                  <span className="text-sm font-medium text-right max-w-[200px] truncate text-white">
                    {tournament.location}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300 flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-200" />
                  Administrator
                </span>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{tournament.admin.username}</p>
                  <p className="text-xs text-slate-400">{tournament.admin.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Competition Fields</span>
                <Badge variant="secondary" className="text-slate-100 bg-slate-700 border-slate-500">
                  {tournament.numberOfFields} field{tournament.numberOfFields !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Tournament Statistics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {tournament._count?.stages || 0}
            </div>
            <div className="text-xs text-gray-500">Stages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {tournament._count?.fields || 0}
            </div>
            <div className="text-xs text-gray-500">Fields</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {tournament._count?.teams || 0}
            </div>
            <div className="text-xs text-gray-500">Teams</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {tournament.fields?.reduce((sum, field) => 
                sum + (field.fieldReferees?.length || 0), 0) || 0}
            </div>
            <div className="text-xs text-gray-500">Referees</div>
          </div>
        </div>
        
        {/* Status Indicators */}
        <div className="flex flex-wrap gap-2">
          {tournament._count?.stages === 0 && (
            <Badge variant="outline" className="text-yellow-700 border-yellow-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              No stages created
            </Badge>
          )}
          
          {tournament._count?.fields === 0 && (
            <Badge variant="outline" className="text-red-700 border-red-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              No fields configured
            </Badge>
          )}
          
          {tournament._count?.teams === 0 && (
            <Badge variant="outline" className="text-blue-700 border-blue-300">
              <Trophy className="h-3 w-3 mr-1" />
              Team registration open
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
