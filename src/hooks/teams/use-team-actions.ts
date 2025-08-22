import { useState } from "react";
import { useRouter } from "next/navigation";
import { Team } from "@/types/team.types";
import { useTeamsMutations } from "./use-teams";

export function useTeamActions() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const router = useRouter();
  const { deleteTeam } = useTeamsMutations();

  const handleViewTeam = (team: Team) => {
    setSelectedTeam(team);
    setShowViewDialog(true);
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setShowEditDialog(true);
  };

  const handleDeleteTeam = (team: Team) => {
    setSelectedTeam(team);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTeam = () => {
    if (selectedTeam) {
      deleteTeam.mutate(selectedTeam.id);
      setShowDeleteDialog(false);
      setSelectedTeam(null);
    }
  };

  const handleViewTeamById = (teamId: string) => {
    router.push(`/teams/${teamId}`);
  };

  const closeDialogs = () => {
    setShowViewDialog(false);
    setShowEditDialog(false);
    setShowDeleteDialog(false);
    setSelectedTeam(null);
  };

  return {
    // State
    selectedTeam,
    showViewDialog,
    showEditDialog,
    showDeleteDialog,
    
    // Actions
    handleViewTeam,
    handleEditTeam,
    handleDeleteTeam,
    handleViewTeamById,
    confirmDeleteTeam,
    closeDialogs,
    
    // Mutation state
    isDeleting: deleteTeam.isPending,
    
    // Dialog setters
    setShowViewDialog,
    setShowEditDialog,
    setShowDeleteDialog,
  };
}
