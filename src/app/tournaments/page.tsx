import TournamentDataTable from "@/components/data-table/TournamentDataTable";

export default function TournamentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
            Tournaments
          </h1>
          <p className="text-base text-gray-600">All robotics tournaments</p>
        </div>
      </div>

      <TournamentDataTable />
    </div>
  );
}
