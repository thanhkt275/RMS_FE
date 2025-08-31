'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, MapPin, Users, Shield, Edit2, UserPlus, Calendar, FileText, Settings, Play, Users2 } from 'lucide-react';
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
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const updateTournament = useUpdateTournament(tournament.id);

  const quickActions = [
    {
      label: 'Manage Teams',
      icon: UserPlus,
      action: () => router.push(`/tournaments/${tournament.id}/teams`),
      variant: 'default' as const,
    },
    {
      label: 'Generate Schedule',
      icon: Calendar,
      action: () => window.open('/stages', '_blank'),
      variant: 'outline' as const,
    },
    {
      label: 'Match Control',
      icon: Play,
      action: () => window.open(`/control-match?tournament=${tournament.id}`, '_blank'),
      variant: 'outline' as const,
    },
    {
      label: 'Reports',
      icon: FileText,
      action: () => router.push(`/tournaments/${tournament.id}/reports`),
      variant: 'outline' as const,
    },
  ];

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
          title="Team Registration" 
          value={tournament.maxTeams 
            ? `${tournament._count?.teams || 0}/${tournament.maxTeams}` 
            : (tournament._count?.teams || 0).toString()
          }
          subtitle={tournament.maxTeams 
            ? `${tournament.maxTeams - (tournament._count?.teams || 0)} spots remaining`
            : "No limit set"
          }
          icon={<Shield className="h-5 w-5" />}
          variant={tournament.maxTeams && (tournament._count?.teams || 0) >= tournament.maxTeams 
            ? 'warning' 
            : 'default'
          }
        />
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant}
                onClick={action.action}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <action.icon className="h-5 w-5" />
                <span className="text-sm">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Team Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Team Registration</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                {tournament.maxTeams 
                  ? `${tournament._count?.teams || 0}/${tournament.maxTeams}` 
                  : (tournament._count?.teams || 0).toString()
                }
                {tournament.maxTeams && (
                  <Badge 
                    variant={(tournament._count?.teams || 0) >= tournament.maxTeams ? 'destructive' : 'default'}
                    className="text-xs"
                  >
                    {(tournament._count?.teams || 0) >= tournament.maxTeams ? 'Full' : 'Open'}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {tournament.maxTeams 
                  ? `${tournament.maxTeams - (tournament._count?.teams || 0)} spots remaining`
                  : "No team limit set"
                }
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Team Size Limit</div>
              <div className="text-2xl font-bold">
                {tournament.maxTeamMembers || 'No limit'}
              </div>
              <div className="text-sm text-gray-600">
                {tournament.maxTeamMembers 
                  ? `Max ${tournament.maxTeamMembers} members per team`
                  : "Unlimited team size"
                }
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Quick Actions</div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => router.push(`/tournaments/${tournament.id}/teams`)}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage Teams
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/tournaments/${tournament.id}/teams/register`)}
                  className="w-full"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Register New Team
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
