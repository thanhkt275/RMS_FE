"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  PlusIcon,
  PencilIcon,
  Eye,
  TrashIcon,
  LogIn,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import DataTable, {
  defaultTableState,
} from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import {
  useTournaments,
  useDeleteTournament,
} from "@/hooks/tournaments/use-tournaments";
import type { Tournament } from "@/types/types";
import TournamentDialog from "@/components/dialogs/TournamentDialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/common/use-auth";
import { UserRole } from "@/types/user.types";
import { useResponsiveLayout } from "@/hooks/common/use-responsive-layout";
import ResponsiveTournamentDisplay from "@/components/features/tournaments/ResponsiveTournamentDisplay";

const TournamentDataTable = () => {
  const { user, isLoading: userIsLoading } = useAuth();
  const { screenSize, isMounted } = useResponsiveLayout();
  const {
    data: tournaments,
    isLoading: tournamentsLoading,
    error: tournamentsError,
  } = useTournaments();
  const deleteTournament = useDeleteTournament();

  const [tableState, setTableState] = useState(defaultTableState);
  const [isTournamentDialogOpen, setIsTournamentDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<
    Tournament | undefined
  >(undefined);

  const handleEditTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setIsTournamentDialogOpen(true);
  };

  const handleDeleteTournament = () => {
    if (!selectedTournament) return;
    deleteTournament.mutate(selectedTournament.id);
    setSelectedTournament(undefined);
  };

  if (userIsLoading) return null;

  const tournamentDataTableColumns: ColumnDef<Tournament>[] = [
    {
      accessorKey: "name",
      header: "Name",
      //enableSorting: true,
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString(),
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => new Date(row.original.endDate).toLocaleDateString(),
    },
    {
      accessorKey: "numberOfFields",
      header: "Fields",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const tournament = row.original as Tournament;

        return (
          <div className="flex items-center gap-2">
            <Link href={`/tournaments/${tournament.id}`} passHref>
              <Button
                variant="outline"
                size="icon"
                className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white focus:ring-2 focus:ring-primary-700"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    toast.info("Login required", {
                      description:
                        "You must be logged in to join a tournament.",
                    });
                    return;
                  }
                }}
              >
                {!user || user?.role === UserRole.COMMON ? (
                  <>
                    <LogIn size={16} />
                    <span className="sr-only">Register</span>
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    <span className="sr-only">View</span>
                  </>
                )}
              </Button>
            </Link>

            {user?.role === UserRole.ADMIN && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-blue-500 shadow-sm"
                  onClick={() => handleEditTournament(tournament)}
                >
                  <PencilIcon size={16} />
                  <span className="sr-only">Edit</span>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-gray-700 text-red-400 hover:bg-red-900/30 hover:text-red-300 focus:ring-2 focus:ring-red-700"
                      onClick={() => setSelectedTournament(tournament)}
                    >
                      <TrashIcon size={16} />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete{" "}
                        <span className="font-semibold">
                          {selectedTournament?.name}
                        </span>
                        ? This action cannot be undone and will also delete all
                        associated stages, matches, and team assignments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteTournament}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <ResponsiveTournamentDisplay
        tournaments={tournaments ?? []}
        columns={tournamentDataTableColumns}
        tableState={tableState}
        setTableState={setTableState}
        loading={tournamentsLoading}
        actionControls={[
          user?.role === UserRole.ADMIN && (
            <Button
              onClick={() => setIsTournamentDialogOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200 min-h-[44px] touch-target"
            >
              <PlusIcon size={18} />
              Add Tournament
            </Button>
          ),
        ]}
        emptyState={
          <Card className="shadow-none border border-gray-200 bg-white">
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <UsersRound className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No tournaments available
                </h3>
                <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto">
                  {user?.role === UserRole.ADMIN
                    ? "Create your first tournament to get started."
                    : "There are currently no tournaments available to join. Please check back later."}
                </p>
              </div>
              {user?.role === UserRole.ADMIN && (
                <Button
                  onClick={() => setIsTournamentDialogOpen(true)}
                  className="bg-blue-600 text-white font-medium rounded-md px-5 py-2.5 shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none transition min-h-[44px] touch-target"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Tournament
                </Button>
              )}
            </CardContent>
          </Card>
        }
        onEdit={handleEditTournament}
        onDelete={(tournament) => {
          setSelectedTournament(tournament);
          // The delete will be handled by the card's AlertDialog
        }}
      />

      <TournamentDialog
        open={isTournamentDialogOpen}
        onOpenChange={setIsTournamentDialogOpen}
        tournament={selectedTournament}
      />
    </>
  );
};

export default TournamentDataTable;
