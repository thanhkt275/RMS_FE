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
import type { Tournament } from "@/types/tournament.types";
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

const TournamentDataTable = () => {
  const { user, isLoading: userIsLoading } = useAuth();
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

  if (userIsLoading) return;

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
      accessorKey: "admin.email",
      header: "Admin",
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
      <DataTable
        data={tournaments ?? []}
        columns={tournamentDataTableColumns as ColumnDef<unknown>[]}
        tableState={tableState}
        setTableState={setTableState}
        showPagination={false}
        isLoading={tournamentsLoading}
        actionControls={[
          user?.role === UserRole.ADMIN && (
            <Button
              onClick={() => setIsTournamentDialogOpen(true)}
              className="flex items-center gap-2 bg-blue-500 text-white font-semibold rounded-lg px-5 py-2.5 shadow-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200"
            >
              <PlusIcon size={18} />
              Add Tournament
            </Button>
          ),
        ]}
        emptyState={
          <Card className="shadow-none border border-gray-800 bg-gray-900">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-1">
                  No tournaments available
                </h3>
                <p className="text-gray-400 text-base">
                  {user?.role === UserRole.ADMIN
                    ? "Create your first tournament to get started."
                    : "There are currently no tournaments available to join. Please check back later."}
                </p>
              </div>
              {user?.role === UserRole.ADMIN && (
                <Button
                  onClick={() => setIsTournamentDialogOpen(true)}
                  className="bg-primary-600 text-white font-medium rounded-md px-5 py-2.5 shadow-sm hover:bg-primary-700 focus:ring-2 focus:ring-primary-400 focus:outline-none transition"
                >
                  Create Tournament
                </Button>
              )}
            </CardContent>
          </Card>
        }
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
