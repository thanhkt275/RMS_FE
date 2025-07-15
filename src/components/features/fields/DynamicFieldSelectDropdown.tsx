import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { useEffect } from "react";

export interface Field {
  id: string;
  tournamentId: string;
  number: number;
  name: string;
  tournament?: {
    id: string;
    name: string;
  };
}

interface DynamicFieldSelectDropdownProps {
  selectedTournamentId?: string;
  selectedFieldId?: string | null;
  onFieldChange?: (fieldId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Hook to fetch fields for a specific tournament
export function useTournamentFields(tournamentId: string) {
  return useQuery<Field[]>({
    queryKey: ["tournamentFields", tournamentId],
    queryFn: async () => {
      if (!tournamentId || tournamentId === "all") return [];
      return await apiClient.get<Field[]>(`tournaments/${tournamentId}/fields`);
    },
    enabled: !!tournamentId && tournamentId !== "all",
  });
}

// Hook to fetch all fields from all tournaments
export function useAllFields() {
  return useQuery<Field[]>({
    queryKey: ["allFields"],
    queryFn: async () => {
      // We need to fetch all tournaments first, then get fields for each
      const tournaments = await apiClient.get<any[]>('tournaments');
      const allFields: Field[] = [];
      
      for (const tournament of tournaments) {
        try {
          const fields = await apiClient.get<Field[]>(`tournaments/${tournament.id}/fields`);
          // Add tournament info to each field for display purposes
          const fieldsWithTournament = fields.map(field => ({
            ...field,
            tournament: {
              id: tournament.id,
              name: tournament.name
            }
          }));
          allFields.push(...fieldsWithTournament);
        } catch (error) {
          console.warn(`Failed to fetch fields for tournament ${tournament.id}:`, error);
        }
      }
      
      return allFields;
    },
  });
}

export default function DynamicFieldSelectDropdown({
  selectedTournamentId,
  selectedFieldId,
  onFieldChange,
  placeholder,
  disabled = false,
}: DynamicFieldSelectDropdownProps) {
  const isAllTournaments = selectedTournamentId === "all" || !selectedTournamentId;
  
  // Fetch fields based on tournament selection
  const { data: tournamentFields, isLoading: isLoadingTournamentFields } = useTournamentFields(
    isAllTournaments ? "" : selectedTournamentId || ""
  );
  const { data: allFields, isLoading: isLoadingAllFields } = useAllFields();
  
  const fields = isAllTournaments ? allFields : tournamentFields;
  const isLoading = isAllTournaments ? isLoadingAllFields : isLoadingTournamentFields;

  // Reset field selection when switching between tournament modes if current selection is invalid
  useEffect(() => {
    if (
      selectedFieldId &&
      fields &&
      !fields.some((f) => f.id === selectedFieldId) &&
      onFieldChange
    ) {
      onFieldChange(null);
    }
  }, [fields, selectedFieldId, onFieldChange]);

  const getFieldDisplayName = (field: Field) => {
    if (isAllTournaments && field.tournament) {
      return `${field.tournament.name} - ${field.name || `Field ${field.number}`}`;
    }
    return field.name || `Field ${field.number}`;
  };

  return (
    <Select
      value={selectedFieldId ?? "__all__"}
      onValueChange={(val) => onFieldChange?.(val === "__all__" ? null : val)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-gray-100">
        <SelectValue placeholder={placeholder || (isLoading ? "Loading..." : "All Fields")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All Fields</SelectItem>
        {fields &&
          fields.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {getFieldDisplayName(field)}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
