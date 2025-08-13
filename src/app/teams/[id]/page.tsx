"use client";

import { notFound } from "next/navigation";
import { TeamDetails } from "@/components/features/teams/TeamDetails";
import { useTeamById } from "@/hooks/teams/use-teams";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorMessage } from "@/components/ui/error-message";
import { use } from "react";

interface TeamPageProps {
  params: Promise<{ id: string }>;
}

export default function TeamPage({ params }: TeamPageProps) {
  const { id: teamId } = use(params);
  const { data: team, isLoading, error } = useTeamById(teamId);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <ErrorMessage title="Failed to load team" message={error.message} />
      </div>
    );
  }

  if (!team) {
    notFound();
    return null;
  }

  return <TeamDetails team={team} />;
}
