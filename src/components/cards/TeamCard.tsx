"use client";

import { useParams } from "next/navigation";
import TeamForm from "@/components/forms/TeamForm";
import { useTournament } from "@/hooks/tournaments/use-tournaments";
import { Skeleton } from "@/components/ui/skeleton"; // optional if you want loading UI
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"; // optional error display

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

  const defaultValues = userTeam
    ? {
        ...userTeam,
        referralSource: userTeam.referralSource ?? "",
        termsAccepted: false,
        teamMembers: userTeam.teamMembers || [],
      }
    : undefined;

  return <TeamForm defaultValues={defaultValues} />;
}
