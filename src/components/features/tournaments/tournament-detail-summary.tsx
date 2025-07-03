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
  Info
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import { Tournament } from '@/lib/types/tournament.types';

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
        
        {/* Key Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Start Date</span>
                <span className="text-sm font-medium">
                  {format(startDate, 'PPP')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">End Date</span>
                <span className="text-sm font-medium">
                  {format(endDate, 'PPP')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Duration</span>
                <Badge variant="outline" className="text-xs">
                  {getDurationText()}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Tournament Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Details
            </h3>
            <div className="space-y-3">
              {tournament.location && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Location
                  </span>
                  <span className="text-sm font-medium text-right max-w-[200px] truncate">
                    {tournament.location}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Administrator
                </span>
                <div className="text-right">
                  <p className="text-sm font-medium">{tournament.admin.username}</p>
                  <p className="text-xs text-gray-500">{tournament.admin.email}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Competition Fields</span>
                <Badge variant="secondary">
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
