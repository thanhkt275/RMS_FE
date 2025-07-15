import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { useEffect } from "react";

export interface Field {
  id: string;
  tournamentId: string;
  number: number;
  name: string;
}

interface FieldSelectDropdownProps {
  tournamentId?: string;
  selectedFieldId?: string | null;
  onFieldSelect?: (fieldId: string | null) => void;
  onFieldChange?: (fieldId: string | null) => void;
  placeholder?: string;
  showAllFieldsOption?: boolean;
  disabled?: boolean;
}

export function useTournamentFields(tournamentId: string) {
  return useQuery<Field[]>({
    queryKey: ["tournamentFields", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      return await apiClient.get<Field[]>(`tournaments/${tournamentId}/fields`);
    },
    enabled: !!tournamentId,
  });
}

export default function FieldSelectDropdown({
  tournamentId,
  selectedFieldId,
  onFieldSelect,
  onFieldChange,
  placeholder,
  showAllFieldsOption = true,
  disabled = false,
}: FieldSelectDropdownProps) {
  const { data: fields, isLoading } = useTournamentFields(tournamentId || '');

  // Use whichever callback is provided
  const handleFieldChange = onFieldSelect || onFieldChange;

  // Ensure selectedFieldId is valid
  useEffect(() => {
    if (
      selectedFieldId &&
      fields &&
      !fields.some((f) => f.id === selectedFieldId) &&
      handleFieldChange
    ) {
      handleFieldChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selectedFieldId]);

  return (
    <Select
      value={selectedFieldId ?? "__all__"}
      onValueChange={(val) => handleFieldChange?.(val === "__all__" ? null : val)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-gray-100">
        <SelectValue placeholder={placeholder || (isLoading ? "Loading..." : showAllFieldsOption ? "All Fields" : "Select Field")} />
      </SelectTrigger>
      <SelectContent>
        {showAllFieldsOption && (
          <SelectItem value="__all__">All Fields</SelectItem>
        )}
        {fields &&
          fields.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {field.name || `Field ${field.number}`}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
