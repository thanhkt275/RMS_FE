'use client';

import { useState } from 'react';
import { Trophy, MapPin, Users, Shield, Edit2 } from 'lucide-react';
import type { Tournament, TournamentStats } from '@/types/tournament.types';
import { useUpdateTournament } from '@/hooks/tournaments/use-tournament-mutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard, ProgressStatCard } from '@/components/ui/stat-card';
import { TournamentEditForm } from './tournament-edit-form';
import { TournamentDetailSummary } from './tournament-detail-summary';

interface TournamentDetailsProps {
  tournament: Tournament;
}

function TournamentDetails({ tournament }: TournamentDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Tournament Name</label>
          <p className="text-gray-900 mt-1">{tournament.name}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700">Location</label>
          <p className="text-gray-900 mt-1">{tournament.location || 'Not specified'}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700">Start Date</label>
          <p className="text-gray-900 mt-1">{new Date(tournament.startDate).toLocaleDateString()}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700">End Date</label>
          <p className="text-gray-900 mt-1">{new Date(tournament.endDate).toLocaleDateString()}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700">Number of Fields</label>
          <p className="text-gray-900 mt-1">{tournament.numberOfFields}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700">Administrator</label>
          <p className="text-gray-900 mt-1">{tournament.admin.username}</p>
        </div>
      </div>
      
      {tournament.description && (
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <p className="text-gray-900 mt-1">{tournament.description}</p>
        </div>
      )}
    </div>
  );
}

interface TournamentOverviewProps {
  tournament: Tournament;
  stats: TournamentStats;
}

export function TournamentOverview({ tournament, stats }: TournamentOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateTournament = useUpdateTournament(tournament.id);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Stages" 
          value={stats.totalStages}
          subtitle={`${stats.activeStages} active, ${stats.completedStages} completed`}
          icon={<Trophy className="h-5 w-5" />}
          variant={stats.activeStages > 0 ? 'success' : 'default'}
        />
        
        <ProgressStatCard 
          title="Fields with Head Referee" 
          current={stats.fieldsWithHeadReferee}
          total={stats.totalFields}
          icon={<MapPin className="h-5 w-5" />}
        />
        
        <StatCard 
          title="Total Referees" 
          value={stats.totalReferees}
          subtitle={`${stats.averageRefereesPerField.toFixed(1)} avg per field`}
          icon={<Users className="h-5 w-5" />}
          variant={stats.totalReferees > 0 ? 'info' : 'warning'}
        />
        
        <StatCard 
          title="Registered Teams" 
          value={tournament._count?.teams || 0}
          subtitle="Teams participating"
          icon={<Shield className="h-5 w-5" />}
          variant="default"
        />
      </div>
      
      {/* Tournament Details Summary */}
      <TournamentDetailSummary 
        tournament={tournament}
        isEditing={isEditing}
        onEdit={() => setIsEditing(!isEditing)}
      />

      {/* Edit Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Tournament Details</CardTitle>
          </CardHeader>
          <CardContent>
            <TournamentEditForm 
              tournament={tournament}
              onSuccess={() => setIsEditing(false)}
              onCancel={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Additional Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Field Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Fields with referees</span>
                <Badge 
                  variant={stats.fieldsWithReferees === stats.totalFields ? 'default' : 'secondary'}
                >
                  {stats.fieldsWithReferees}/{stats.totalFields}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Fields with head referee</span>
                <Badge 
                  variant={stats.fieldsWithHeadReferee === stats.totalFields ? 'default' : 'secondary'}
                  className={stats.fieldsWithHeadReferee === stats.totalFields ? 'bg-green-100 text-green-800' : ''}
                >
                  {stats.fieldsWithHeadReferee}/{stats.totalFields}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average referees per field</span>
                <Badge variant="outline">
                  {stats.averageRefereesPerField.toFixed(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stage Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active stages</span>
                <Badge variant="default" className="bg-green-600">
                  {stats.activeStages}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed stages</span>
                <Badge variant="secondary">
                  {stats.completedStages}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Upcoming stages</span>
                <Badge variant="outline">
                  {Math.max(0, stats.totalStages - stats.activeStages - stats.completedStages)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
