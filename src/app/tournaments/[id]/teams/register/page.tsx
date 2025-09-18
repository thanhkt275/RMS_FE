"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTournament } from "@/hooks/tournaments/use-tournaments";
import { AdminRoute } from "@/components/admin/admin-route";
import { UnifiedTeamForm } from "@/components/forms/UnifiedTeamForm";

export default function RegisterTeamPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const router = useRouter();

  // Fetch tournament data
  const { data: tournament, isLoading: tournamentLoading } = useTournament(tournamentId);

  if (tournamentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tournament...</p>
        </div>
      </div>
    );
  }

  const handleSuccess = () => {
    router.push(`/tournaments/${tournamentId}/teams`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <AdminRoute fallbackMessage="Only administrators can register teams.">
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-4xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 line-clamp-1">Register New Team</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {tournament?.name}
                {tournament?.maxTeamMembers && ` • Max ${tournament.maxTeamMembers} members per team`}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2 min-h-[44px] touch-target w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          {/* Unified Team Form with Admin Profile */}
          <UnifiedTeamForm
            profile="admin"
            mode="create"
            tournament={tournament}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            showModeToggle={true}
          />
        </div>
      </div>
    </AdminRoute>
  );
}
