"use client";

import React, { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UnifiedTeamForm } from "@/components/forms/UnifiedTeamForm";
import { Team } from "@/types/team.types";
import { useRouter } from "next/navigation";
import { useTournament } from "@/hooks/tournaments/use-tournaments";

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  tournamentId: string;
}

// Convert Team to UnifiedTeamForm format
const convertTeamToFormValues = (team: Team) => {
  return {
    name: team.name,
    teamMembers: team.teamMembers?.map(member => ({
      name: member.name,
      gender: member.gender,
      phoneNumber: member.phoneNumber || "",
      email: member.email || "",
      province: member.province || "",
      ward: member.ward || "",
      organization: member.organization || "",
      organizationAddress: member.organizationAddress || "",
      dateOfBirth: member.dateOfBirth || undefined,
    })) || [],
    referralSource: team.referralSource || "other",
  };
};

export function EditTeamDialog({
  open,
  onOpenChange,
  team,
  tournamentId,
}: EditTeamDialogProps) {
  const router = useRouter();
  
  // Fetch tournament data for form constraints
  const { data: tournament } = useTournament(tournamentId);

  // Convert team data to form format
  const formValues = useMemo(() => {
    return team ? convertTeamToFormValues(team) : undefined;
  }, [team]);

  // Handle successful team update
  const handleSuccess = () => {
    onOpenChange(false);
    router.refresh();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-100">
            Edit Team: {team.name}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <UnifiedTeamForm
            profile="detailed"
            mode="edit"
            tournament={tournament}
            defaultValues={formValues}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            showModeToggle={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
