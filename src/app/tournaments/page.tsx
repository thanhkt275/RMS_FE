"use client";

import TournamentDataTable from "@/components/data-table/TournamentDataTable";
import { useResponsiveLayout } from "@/hooks/common/use-responsive-layout";

export default function TournamentsPage() {
  const { screenSize, isMounted } = useResponsiveLayout();

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-4">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-1">
              Tournaments
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              All robotics tournaments
            </p>
          </div>
        </div>

        <TournamentDataTable />
      </div>
    </div>
  );
}
