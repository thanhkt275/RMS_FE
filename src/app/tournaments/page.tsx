"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/hooks/common/use-auth";
import { useTournaments, useDeleteTournament } from "@/hooks/api/use-tournaments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRole } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react";
import TournamentDialog from "./tournament-dialog";

export default function TournamentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data: tournaments, isLoading: tournamentsLoading, error: tournamentsError } = useTournaments();
  const deleteMutation = useDeleteTournament();
  
  // State for dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);

  // Check if user is admin for access control
  useEffect(() => {
    if (!authLoading && user && user.role !== UserRole.ADMIN) {
      toast.error("You don't have permission to access this page", {
        duration: 5000,
        id: "admin-access-denied",
      });
      router.push("/");
    }
  }, [user, authLoading, router]);
  
  // Return null during authentication check to prevent flash of content
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white border border-gray-200 rounded-xl shadow-lg p-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Loading...</h2>
          <p className="text-gray-600">Please wait while we verify your credentials</p>
        </div>
      </div>
    );
  }

  // Only allow admins to access this page
  if (user.role !== UserRole.ADMIN) {
    return null;
  }

  // Handler for opening edit dialog
  const handleEditTournament = (tournament: any) => {
    setSelectedTournament(tournament);
    setIsEditDialogOpen(true);
  };

  // Handler for opening delete dialog
  const handleDeleteClick = (tournament: any) => {
    setSelectedTournament(tournament);
    setIsDeleteDialogOpen(true);
  };

  // Handler for confirming delete
  const handleConfirmDelete = async () => {
    if (!selectedTournament) return;
    
    try {
      await deleteMutation.mutateAsync(selectedTournament.id);
      setIsDeleteDialogOpen(false);
      setSelectedTournament(null);
    } catch (error) {
      console.error("Failed to delete tournament:", error);
    }
  };

  // Handler for navigating to tournament detail page
  const handleTournamentClick = (tournamentId: string) => {
    router.push(`/tournaments/${tournamentId}`);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP");
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">Tournaments</h1>
            <p className="text-base text-gray-600">Manage all robotics tournaments</p>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2 bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200"
          >
            <PlusIcon size={18} />
            Add Tournament
          </Button>
        </div>

      {tournamentsError ? (
        <Alert variant="destructive" className="mb-6 bg-red-50 border border-red-200 text-red-800">
          <AlertTitle className="font-semibold text-red-800">Error</AlertTitle>
          <AlertDescription className="text-red-700">
            Failed to load tournaments. Please try again later.
          </AlertDescription>
        </Alert>
      ) : null}

      {tournamentsLoading ? (
        <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-base text-gray-600">Loading tournaments...</p>
          </CardContent>
        </Card>
      ) : tournaments && tournaments.length > 0 ? (
        <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200">
                  <TableHead className="text-gray-900 font-semibold text-sm">Name</TableHead>
                  <TableHead className="text-gray-900 font-semibold text-sm">Description</TableHead>
                  <TableHead className="text-gray-900 font-semibold text-sm">Start Date</TableHead>
                  <TableHead className="text-gray-900 font-semibold text-sm">End Date</TableHead>
                  <TableHead className="text-gray-900 font-semibold text-sm">Fields</TableHead>
                  <TableHead className="text-gray-900 font-semibold text-sm">Admin</TableHead>
                  <TableHead className="text-right text-gray-900 font-semibold text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournaments.map((tournament) => (
                  <TableRow 
                    key={tournament.id} 
                    className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                    onClick={() => handleTournamentClick(tournament.id)}
                  >
                    <TableCell className="font-medium text-gray-900 whitespace-nowrap">{tournament.name}</TableCell>
                    <TableCell className="text-gray-600 max-w-xs truncate" title={tournament.description}>{tournament.description}</TableCell>
                    <TableCell className="text-gray-700">{formatDate(tournament.startDate)}</TableCell>
                    <TableCell className="text-gray-700">{formatDate(tournament.endDate)}</TableCell>
                    <TableCell className="text-gray-700 text-center">{tournament.numberOfFields ?? 1}</TableCell>
                    <TableCell className="text-gray-700">{tournament.admin?.username || '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-500 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTournament(tournament);
                        }}
                      >
                        <PencilIcon size={16} />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-2 focus:ring-red-500 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(tournament);
                        }}
                      >
                        <TrashIcon size={16} />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border border-gray-200 shadow-lg rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No tournaments found</h3>
              <p className="text-gray-600 text-base">Create your first tournament to get started</p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200">
              Create Tournament
            </Button>
          </CardContent>
        </Card>
      )}

        {/* Create Tournament Dialog */}
        <TournamentDialog 
          isOpen={isCreateDialogOpen} 
          onClose={() => setIsCreateDialogOpen(false)}
          mode="create"
        />

        {/* Edit Tournament Dialog */}
        {selectedTournament && (
          <TournamentDialog
            isOpen={isEditDialogOpen}
            onClose={() => {
              setIsEditDialogOpen(false);
              setSelectedTournament(null);
            }}
            mode="edit"
            tournament={selectedTournament}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold">{selectedTournament?.name}</span>?
                This action cannot be undone and will also delete all associated stages, matches, and team assignments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}