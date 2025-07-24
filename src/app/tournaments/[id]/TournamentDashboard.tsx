"use client";

import { use, useState } from "react";
import { useParams } from "next/navigation";
import { useTournamentManagement } from "@/hooks/api/use-tournament-management";
import { TournamentHeader } from "@/components/features/tournaments/tournament-header";
import { TournamentOverview } from "@/components/features/tournaments/tournament-overview";
import { StagesSection } from "@/components/features/tournaments/stages-section";
import { FieldsSection } from "@/components/features/tournaments/fields-section";
import { ScoreConfigManagement } from "@/components/features/tournaments/score-config-management";
import { TabNavigation } from "@/components/ui/tab-navigation";
import { TournamentSkeleton } from "@/components/ui/tournament-skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";

type TabType = "overview" | "stages" | "fields" | "scoring";

export default function TournamentDashboard() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
  };

  const { tournament, stages, fields, stats, isLoading, isError, error } =
    useTournamentManagement(id);

  if (isLoading) {
    return <TournamentSkeleton />;
  }

  if (isError || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isError ? "Error Loading Tournament" : "Tournament Not Found"}
          </h1>
          <p className="text-gray-600 mb-4">
            {error?.message ||
              "The tournament you're looking for doesn't exist."}
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <TournamentHeader tournament={tournament} />

        <div className="container mx-auto px-4 py-6">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            tabs={[
              { id: "overview", label: "Overview", count: null },
              { id: "stages", label: "Stages", count: stages.length },
              { id: "fields", label: "Fields", count: fields.length },
              { id: "scoring", label: "Score Config", count: null },
            ]}
          />

          <div className="mt-6">
            {activeTab === "overview" && (
              <TournamentOverview tournament={tournament} stats={stats} />
            )}

            {activeTab === "stages" && (
              <StagesSection tournamentId={id} stages={stages} />
            )}

            {activeTab === "fields" && (
              <FieldsSection tournamentId={id} fields={fields} />
            )}

            {activeTab === "scoring" && (
              <ScoreConfigManagement tournament={tournament} />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
