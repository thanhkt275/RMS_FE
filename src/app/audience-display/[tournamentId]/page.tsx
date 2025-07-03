"use client";
import { useRouter, useParams } from "next/navigation";
import { useTournament } from "@/hooks/api/use-tournaments";
import FieldSelectDropdown, { useTournamentFields } from "@/components/fields/FieldSelectDropdown";
import { formatDateRange } from '@/lib/utils';

export default function FieldSelectionPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params?.tournamentId as string;

  // Fetch tournament details
  const { data: tournament, isLoading: isLoadingTournament, isError: isErrorTournament } = useTournament(tournamentId);
  // Fetch fields for this tournament
  const { data: fields = [], isLoading: isLoadingFields, isError: isErrorFields } = useTournamentFields(tournamentId);

  // Handler for field selection
  const handleFieldSelect = (fieldId: string | null) => {
    if (fieldId) {
      router.push(`/audience-display/${tournamentId}/${fieldId}`);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4 w-full">
      <button
        className="mb-8 px-4 py-2 bg-white border-2 border-blue-200 rounded-xl hover:bg-blue-50 text-blue-800 font-bold shadow-md transition-colors duration-200"
        onClick={() => router.push("/audience-display")}
      >
        ← Back to Tournament List
      </button>
      <div className="max-w-2xl mx-auto bg-white border-2 border-blue-200 rounded-2xl shadow-2xl p-10">
        {isLoadingTournament ? (
          <div className="text-center text-blue-800 text-2xl font-bold py-12">Loading tournament...</div>
        ) : isErrorTournament || !tournament ? (
          <div className="text-center text-red-800 bg-red-50 border border-red-200 rounded-xl p-8 font-semibold text-lg">Could not load tournament details.</div>
        ) : (
          <>
            <h1 className="text-4xl font-extrabold text-center mb-4 text-blue-900 drop-shadow-lg">
              {tournament.name}
            </h1>
            <div className="text-center text-lg text-gray-700 mb-6 font-semibold">
              <span className="text-gray-900 font-bold">Dates:</span> <span className="text-blue-800">{formatDateRange(tournament.startDate, tournament.endDate)}</span>
            </div>
            <div className="mb-10">
              <label className="block text-blue-900 font-bold mb-3 text-lg">Select a Field to View</label>
              <FieldSelectDropdown
                tournamentId={tournamentId}
                selectedFieldId={null}
                onFieldSelect={handleFieldSelect}
                showAllFieldsOption={false}
                disabled={isLoadingFields}
              />
            </div>
            {isLoadingFields ? (
              <div className="text-center text-blue-800 font-semibold py-6">Loading fields...</div>
            ) : isErrorFields ? (
              <div className="text-center text-red-800 bg-red-50 border border-red-200 rounded-xl p-4 font-semibold">Could not load fields for this tournament.</div>
            ) : fields.length === 0 ? (
              <div className="text-center text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-4 font-semibold">This tournament has no fields available for display.</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}


