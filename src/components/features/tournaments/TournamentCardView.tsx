/**
 * TournamentCardView Component
 * Mobile-optimized card layout for tournament display
 * Designed for touch interactions and small screens
 */

import React, { useCallback } from 'react';
import Link from 'next/link';
import { Tournament } from '@/types/types';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { 
  Eye, 
  Edit, 
  Trash2, 
  MoreVertical, 
  LogIn, 
  Calendar,
  MapPin,
  User,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/common/use-auth';
import { UserRole } from '@/types/user.types';
import { cn } from '../../../lib/utils';

interface TournamentCardViewProps {
  tournaments: Tournament[];
  loading?: boolean;
  onEdit: (tournament: Tournament) => void;
  onDelete: (tournament: Tournament) => void;
}

export const TournamentCardView: React.FC<TournamentCardViewProps> = ({
  tournaments,
  loading = false,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();

  const handleCardClick = useCallback((e: React.MouseEvent, tournament: Tournament) => {
    // Prevent card click when clicking on action buttons
    if ((e.target as HTMLElement).closest('[data-action]')) {
      return;
    }
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse bg-white">
            <CardHeader className="pb-3">
              {/* Tournament Info Section */}
              <div className="mb-3 space-y-2">
                <div className="w-48 h-5 bg-gray-200 rounded"></div>
                <div className="w-32 h-4 bg-gray-200 rounded"></div>
              </div>
              
              {/* Actions Section */}
              <div className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <div className="w-20 h-8 bg-gray-200 rounded"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="w-full h-3 bg-gray-200 rounded"></div>
                <div className="w-3/4 h-3 bg-gray-200 rounded"></div>
                <div className="flex justify-between">
                  <div className="w-20 h-6 bg-gray-200 rounded-full"></div>
                  <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No tournaments found</h3>
        <p className="text-gray-500 mb-6">
          {user?.role === UserRole.ADMIN
            ? "Create your first tournament to get started."
            : "There are currently no tournaments available to join. Please check back later."}
        </p>
        {user?.role === UserRole.ADMIN && (
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {/* Handle create tournament */}}
          >
            Create Tournament
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {tournaments.map((tournament) => (
        <Card
          key={tournament.id}
          className="cursor-pointer bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          onClick={(e) => handleCardClick(e, tournament)}
        >
          <CardHeader className="pb-4">
            {/* Header with tournament name and actions */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg text-gray-900 mb-2 break-words leading-tight">
                  {tournament.name}
                </CardTitle>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {tournament.admin?.username || `Admin ID: ${tournament.adminId}`}
                  </span>
                </div>
              </div>
              
              {/* Action Button - Top right corner */}
              <div className="flex-shrink-0" data-action="menu">
                <Link href={`/tournaments/${tournament.id}`} passHref>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 min-h-[36px] px-3 whitespace-nowrap shadow-sm"
                    data-action="primary"
                    onClick={(e) => {
                      if (!user) {
                        e.preventDefault();
                        toast.info("Login required", {
                          description: "You must be logged in to join a tournament.",
                        });
                        return;
                      }
                    }}
                  >
                    View
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Description */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 line-clamp-2">
                {tournament.description || "No description provided"}
              </p>
            </div>

            {/* Tournament Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Start:</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(tournament.startDate)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">End:</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(tournament.endDate)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Fields:</span>
                <span className="text-gray-900 font-medium">
                  {tournament.numberOfFields}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TournamentCardView;
