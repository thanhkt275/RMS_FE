'use client';

import { useState } from 'react';
import { Calendar, MapPin, User, Trophy, Edit, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import type { Tournament } from '@/types/tournament.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TournamentEditForm } from './tournament-edit-form';

interface TournamentHeaderProps {
  tournament: Tournament;
}

export function TournamentHeader({ tournament }: TournamentHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const isActive = new Date() >= new Date(tournament.startDate) && new Date() <= new Date(tournament.endDate);
  const isPast = new Date() > new Date(tournament.endDate);
  const isFuture = new Date() < new Date(tournament.startDate);

  const getStatusBadge = () => {
    if (isPast) return <Badge variant="secondary">Completed</Badge>;
    if (isActive) return <Badge variant="default" className="bg-green-600">Active</Badge>;
    return <Badge variant="outline">Upcoming</Badge>;
  };

  const handleEditSuccess = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <TournamentEditForm
            tournament={tournament}
            onCancel={() => setIsEditing(false)}
            onSuccess={handleEditSuccess}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Main Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
              {getStatusBadge()}
            </div>
            
            {tournament.description && (
              <p className="text-gray-600 mb-4 max-w-2xl">{tournament.description}</p>
            )}
            
            {/* Tournament Details */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(tournament.startDate), 'MMM d, yyyy')} - {format(new Date(tournament.endDate), 'MMM d, yyyy')}
                </span>
              </div>
              
              {tournament.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{tournament.location}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Admin: {tournament.admin.username}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                <span>{tournament._count.teams} teams</span>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              Export Data
            </Button>
            <Button variant="outline" size="sm">
              Settings
            </Button>
            <Button size="sm">
              Start Match
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
