"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Plus, 
  UserPlus,
  Eye,
  Settings,
  Upload,
  FileText,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTournament } from "@/hooks/tournaments/use-tournaments";
import { AdminRoute } from "@/components/admin/admin-route";
import { useAuth } from "@/hooks/common/use-auth";
import { apiClient } from "@/lib/api-client";
import { QueryKeys } from "@/lib/query-keys";
import { TeamsTable } from "@/components/features/teams/TeamsTable";
import { UserRole } from "@/types/types";

export default function TournamentTeamsPage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Dialog states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");

  // Fetch tournament data
  const { data: tournament, isLoading: tournamentLoading } = useTournament(tournamentId);

  // Fetch teams for this tournament
  const { data: teams = [], isLoading: teamsLoading, refetch: refetchTeams } = useQuery({
    queryKey: QueryKeys.teams.byTournament(tournamentId),
    queryFn: async () => {
      console.log("🔍 Fetching teams for tournament:", tournamentId);
      try {
        // Try the tournament-specific endpoint first
        const response = await apiClient.get<any[]>(`/tournaments/${tournamentId}/teams`);
        console.log("✅ Teams fetched from tournament endpoint:", response.length, "teams");
        return response;
      } catch (error) {
        console.warn("⚠️ Tournament endpoint failed, trying fallback:", error);
        try {
          // Fallback to general teams endpoint with tournament filter
          const response = await apiClient.get<any[]>(`/teams?tournamentId=${tournamentId}`);
          console.log("✅ Teams fetched from fallback endpoint:", response.length, "teams");
          return response;
        } catch (fallbackError) {
          console.error("❌ Both endpoints failed:", fallbackError);
          return [];
        }
      }
    },
    enabled: !!tournamentId,
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      await apiClient.delete(`/teams/${teamId}`);
    },
    onSuccess: () => {
      toast.success("Team deleted successfully");
      refetchTeams();
    },
    onError: (error: any) => {
      toast.error("Failed to delete team");
      console.error("Delete team error:", error);
    },
  });

  // Import teams mutation
  const importTeamsMutation = useMutation({
    mutationFn: async (csvData: string) => {
      return await apiClient.post('/teams/import', {
        content: csvData,
        format: 'csv',
        hasHeader: true,
        delimiter: ',',
        tournamentId: tournamentId,
      });
    },
    onSuccess: (result) => {
      toast.success(`Successfully imported ${result.totalCreated} teams`);
      setImportDialogOpen(false);
      setCsvContent("");
      refetchTeams();
    },
    onError: (error: any) => {
      toast.error("Failed to import teams");
      console.error("Import teams error:", error);
    },
  });

  // Event handlers for TeamsTable
  const handleViewTeam = (teamId: string) => {
    router.push(`/teams/${teamId}`);
  };

  const handleEditTeam = (teamId: string) => {
    router.push(`/teams/${teamId}/edit`);
  };

  const handleDeleteTeam = (teamId: string) => {
    deleteTeamMutation.mutate(teamId);
  };

  // Import handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleImportTeams = () => {
    if (!csvContent.trim()) {
      toast.error("Please provide CSV content");
      return;
    }
    importTeamsMutation.mutate(csvContent);
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    setCsvContent("");
  };

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

  return (
    <AdminRoute fallbackMessage="Only administrators can access team management.">
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 line-clamp-1">Team Management</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {tournament?.name} • {teams.length} teams registered
                {tournament?.maxTeams && ` (${teams.length}/${tournament.maxTeams})`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center justify-center gap-2 min-h-[44px] touch-target w-full sm:w-auto"
                  >
                    <Upload className="h-4 w-4" />
                    Import Teams
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Import Teams from CSV</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="csv-file" className="text-sm font-medium">
                        Upload CSV File
                      </Label>
                      <input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="csv-content" className="text-sm font-medium">
                        Or paste CSV content directly
                      </Label>
                      <Textarea
                        id="csv-content"
                        placeholder="Team Name,Email,Number of member,School/Organization,Location&#10;Robotics Team 1,test@example.com,3,THPT ABC,Hanoi&#10;Tech Warriors,test2@example.com,4,THPT XYZ,Ho Chi Minh"
                        value={csvContent}
                        onChange={(e) => setCsvContent(e.target.value)}
                        rows={8}
                        className="mt-1"
                      />
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      <p className="font-medium mb-2">CSV Format:</p>
                      <p className="font-mono text-xs">
                        Team Name,Email,Number of member,School/Organization,Location
                      </p>
                      <p className="mt-2 text-xs">
                        • First row should be headers<br/>
                        • Email is optional<br/>
                        • Number of members must be a positive integer<br/>
                        • School/Organization and Location are optional
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCloseImportDialog}
                        disabled={importTeamsMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleImportTeams}
                        disabled={importTeamsMutation.isPending || !csvContent.trim()}
                      >
                        {importTeamsMutation.isPending ? "Importing..." : "Import Teams"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                onClick={() => router.push(`/tournaments/${tournamentId}/teams/register`)}
                className="flex items-center justify-center gap-2 min-h-[44px] touch-target w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Register New Team
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="min-h-[44px] touch-target w-full sm:w-auto"
              >
                Back to Tournament
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Card className="border-blue-200">
              <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total Teams</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-700">{teams.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-200">
              <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Spots Available</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-700">
                      {tournament?.maxTeams ? Math.max(0, tournament.maxTeams - teams.length) : "∞"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200">
              <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                    <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Max Team Size</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-700">
                      {tournament?.maxTeamMembers || "No limit"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                    <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total Members</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-700">
                      {teams.reduce((sum, team) => sum + (team._count?.teamMembers || team.teamMemberCount || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Teams Table */}
          <TeamsTable
            teams={teams}
            isLoading={teamsLoading}
            selectedTournamentId={tournamentId}
            userRole={user?.role as UserRole || null}
            userId={user?.id}
            userEmail={user?.email}
            onViewTeam={handleViewTeam}
            onEditTeam={handleEditTeam}
            onDeleteTeam={handleDeleteTeam}
          />
        </div>
      </div>
    </AdminRoute>
  );
}
