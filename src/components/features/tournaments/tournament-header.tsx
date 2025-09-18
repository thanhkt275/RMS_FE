'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, User, Trophy, Edit, Save, X, Download, Settings, Play, MoreVertical, Copy, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Tournament } from '@/types/tournament.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TournamentEditForm } from './tournament-edit-form';
import { 
  useExportTournamentData, 
  useDeleteTournament, 
  useDuplicateTournament,
  useStartMatch 
} from '@/hooks/tournaments/use-tournament-mutations';
import { toast } from 'sonner';

interface TournamentHeaderProps {
  tournament: Tournament;
}

export function TournamentHeader({ tournament }: TournamentHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  
  // Mutations
  const exportData = useExportTournamentData(tournament.id);
  const deleteTournament = useDeleteTournament();
  const duplicateTournament = useDuplicateTournament();
  const startMatch = useStartMatch(tournament.id);
  
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

  const handleExportData = async (format: 'csv' | 'excel' | 'json') => {
    try {
      await exportData.mutateAsync(format);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleStartMatch = () => {
    // Navigate to match control page for this tournament
    router.push(`/control-match?tournament=${tournament.id}`);
  };

  const handleTournamentSettings = () => {
    // Navigate to tournament settings page
    router.push(`/tournaments/${tournament.id}/settings`);
  };

  const handleDeleteTournament = async () => {
    try {
      await deleteTournament.mutateAsync(tournament.id);
      router.push('/tournaments');
    } catch (error) {
      console.error('Delete failed:', error);
    }
    setShowDeleteDialog(false);
  };

  const handleDuplicateTournament = async () => {
    try {
      const newName = `${tournament.name} (Copy)`;
      await duplicateTournament.mutateAsync({ 
        tournamentId: tournament.id, 
        name: newName 
      });
    } catch (error) {
      console.error('Duplicate failed:', error);
    }
    setShowDuplicateDialog(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 sm:py-6">
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
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Main Info */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{tournament.name}</h1>
              {getStatusBadge()}
            </div>
            
            {tournament.description && (
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 max-w-2xl">{tournament.description}</p>
            )}
            
            {/* Tournament Details */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>
                  {format(new Date(tournament.startDate), 'MMM d, yyyy')} - {format(new Date(tournament.endDate), 'MMM d, yyyy')}
                </span>
              </div>
              
              {tournament.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{tournament.location}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <User className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Admin: {tournament.admin.username}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{tournament._count.teams} teams</span>
              </div>
            </div>
          </div>
          
          {/* Actions - Mobile: Stacked, Desktop: Row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            {/* Primary Actions - Always visible */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-[36px] touch-target"
              >
                <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="sm:inline">Edit</span>
              </Button>
              
              <Button 
                size="sm"
                onClick={handleStartMatch}
                disabled={isPast}
                className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-[36px] touch-target"
              >
                <Play className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="sm:inline">{isActive ? 'Control' : 'Start'}</span>
              </Button>
            </div>

            {/* Secondary Actions - Desktop dropdown, Mobile expanded */}
            <div className="flex gap-2 sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 min-h-[40px] touch-target">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExportData('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportData('excel')}>
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportData('json')}>
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleTournamentSettings}
                className="flex-1 min-h-[40px] touch-target"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExportData('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportData('excel')}>
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportData('json')}>
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleTournamentSettings}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowDuplicateDialog(true)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Tournament
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Tournament
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile More Actions */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full min-h-[40px] touch-target">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    More Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowDuplicateDialog(true)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Tournament
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Tournament
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="mx-4 max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{tournament.name}"? This action cannot be undone.
                All associated matches, scores, and data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteTournament}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                Delete Tournament
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Duplicate Confirmation Dialog */}
        <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <AlertDialogContent className="mx-4 max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Duplicate Tournament</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a copy of "{tournament.name}" with all settings but no matches or scores.
                The new tournament will be named "{tournament.name} (Copy)".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDuplicateTournament}
                className="w-full sm:w-auto"
              >
                Duplicate Tournament
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
