"use client";

import { useParams } from "next/navigation";
import { UnifiedTeamForm } from "@/components/forms/UnifiedTeamForm";
import { useTournament } from "@/hooks/tournaments/use-tournaments";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function TeamCard() {
  const params = useParams();
  const tournamentId = typeof params.id === "string" ? params.id : "";

  const { data: tournament, isLoading, isError } = useTournament(tournamentId);

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !tournament) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load tournament data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const userTeam = tournament.userTeam;

  // Convert userTeam to UnifiedTeamForm format
  const defaultValues = userTeam
    ? {
        name: userTeam.name,
        teamMembers: userTeam.teamMembers?.map(member => ({
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
        referralSource: userTeam.referralSource || "other",
      }
    : undefined;

  return (
    <UnifiedTeamForm
      profile="detailed"
      mode={userTeam ? "edit" : "create"}
      tournament={tournament}
      defaultValues={defaultValues}
      showModeToggle={false}
    />
  );
}
