"use client";

import React, { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TeamForm from "@/components/forms/TeamForm";
import { Team } from "@/types/team.types";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  tournamentId: string;
}

// Convert Team to FormValues format
const convertTeamToFormValues = (team: Team) => {
  return {
    id: team.id,
    name: team.name,
    teamMembers: team.teamMembers?.map(member => ({
      id: member.id,
      name: member.name,
      gender: member.gender,
      phoneNumber: member.phoneNumber || "",
      email: member.email || "",
      province: member.province || "",
      ward: member.ward || "",
      organization: member.organization || "",
      organizationAddress: member.organizationAddress || "",
      dateOfBirth: member.dateOfBirth ? format(new Date(member.dateOfBirth), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    })) || [{
      name: "",
      gender: null,
      phoneNumber: "",
      email: "",
      province: "",
      ward: "",
      organization: "",
      organizationAddress: "",
      dateOfBirth: format(new Date(), 'yyyy-MM-dd'),
    }],
    referralSource: team.referralSource || "other",
    termsAccepted: true, // Assume already accepted for existing teams
  };
};

export function EditTeamDialog({
  open,
  onOpenChange,
  team,
  tournamentId,
}: EditTeamDialogProps) {
  const router = useRouter();

  // Convert team data to form format
  const formValues = useMemo(() => {
    return team ? convertTeamToFormValues(team) : undefined;
  }, [team]);

  // Close dialog when team is updated successfully
  useEffect(() => {
    if (!open && team) {
      // Team was updated, refresh the page or invalidate queries
      router.refresh();
    }
  }, [open, team, router]);

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
          <TeamForm 
            defaultValues={formValues}
            maxTeamMembers={5}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
