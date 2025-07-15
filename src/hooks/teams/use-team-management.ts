import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type { Team } from "@/types/types";

export interface ImportResult {
  success: boolean;
  message: string;
}

export function useTeamManagement() {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const importTeams = useCallback(async (
    content: string,
    tournamentId: string,
    delimiter: string = ","
  ): Promise<ImportResult> => {
    if (!tournamentId) {
      const result = { success: false, message: "Please select a tournament before importing teams." };
      setImportResult(result);
      return result;
    }

    if (!content) {
      const result = { success: false, message: "Please provide CSV content before importing teams." };
      setImportResult(result);
      return result;
    }

    setIsImporting(true);
    setImportResult(null);
    
    try {
      const result = await apiClient.post("/teams/import", {
        content,
        format: "csv",
        hasHeader: true,
        tournamentId,
        delimiter,
      });
      setImportResult(result);
      return result;
    } catch (e: any) {
      const result = { success: false, message: e.message };
      setImportResult(result);
      return result;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const exportTeams = useCallback((teams: Team[]) => {
    const csv = [
      ["Team Number", "Name", "Organization", "Description"],
      ...teams.map((t) => [t.teamNumber, t.name, t.organization || "", t.description || ""]),
    ]
      .map((row) => row.map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teams.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    isImporting,
    importResult,
    importTeams,
    exportTeams,
    setImportResult,
  };
}
