"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadIcon, DownloadIcon } from "lucide-react";
import { LeaderboardTable } from "@/components/features/leaderboard/leaderboard-table";
import { LeaderboardFilters } from "@/components/features/leaderboard/leaderboard-filters";
import { teamLeaderboardColumns, TeamLeaderboardRow } from "@/components/features/leaderboard/team-leaderboard-columns";
import { TeamStatsRecalculateButton } from "@/components/features/admin/team-stats-recalculate-button";
import { useTeams } from "@/hooks/teams/use-teams";
import { useTeamsPageData } from "@/hooks/teams/use-teams-page-data";
import { useTeamManagement } from "@/hooks/teams/use-team-management";

export default function TeamsPage() {
  // Teams page data hook - handles all the complex selection and data fetching logic
  const {
    selectedTournamentId,
    setSelectedTournamentId,
    selectedStageId,
    setSelectedStageId,
    tournaments,
    filteredStages,
    leaderboardRows,
    isLoading: dataLoading,
    tournamentsLoading,
    stagesLoading,
    ALL_TEAMS_OPTION,
  } = useTeamsPageData();

  // Team management hook - handles import/export functionality
  const {
    isImporting,
    importResult,
    importTeams,
    exportTeams,
    setImportResult,
  } = useTeamManagement();

  // All teams query for export functionality
  const { data: allTeams = [] } = useTeams(selectedTournamentId);

  // Local UI state
  const [showImportCard, setShowImportCard] = useState(false);
  const [importContent, setImportContent] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [delimiter, setDelimiter] = useState<string>(",");

  // State for leaderboard filters
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [rankRange, setRankRange] = useState<[number, number]>([1, 100]);
  const [totalScoreRange, setTotalScoreRange] = useState<[number, number]>([0, 1000]);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !workerRef.current) {
      workerRef.current = new Worker(new URL('./parseCsv.worker.ts', import.meta.url));
      workerRef.current.onmessage = (e: MessageEvent) => {
        if (e.data.error) {
          setImportError(e.data.error);
        } else if (e.data.csv) {
          setImportContent(e.data.csv);
          setImportError(null);
        }
      };
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);
  // Filtering logic for leaderboard
  const filteredRows: TeamLeaderboardRow[] = useMemo(
    () =>
      leaderboardRows.filter(
        (row) =>
          (!teamName || row.teamName.toLowerCase().includes(teamName.toLowerCase())) &&
          (!teamCode || row.teamCode.toLowerCase().includes(teamCode.toLowerCase())) &&
          row.rank >= rankRange[0] &&
          row.rank <= rankRange[1] &&
          row.totalScore >= totalScoreRange[0] &&
          row.totalScore <= totalScoreRange[1]
      ),
    [leaderboardRows, teamName, teamCode, rankRange, totalScoreRange]
  );

  async function handleImport() {
    const result = await importTeams(importContent, selectedTournamentId, delimiter);
    if (result.success) {
      // Optionally refetch data or handle success
    }
  }

  function handleExport() {
    exportTeams(allTeams);
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight mb-1">Teams</h1>
          <p className="text-base text-gray-400">View, import, export, and manage teams</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
            <SelectTrigger className="w-full md:w-56 bg-blue-950 border-blue-700 text-blue-100">
              <SelectValue placeholder={tournamentsLoading ? "Loading tournaments..." : "Select a tournament"} />
            </SelectTrigger>
            <SelectContent>
              {tournaments?.map((tournament) => (
                <SelectItem key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>          <Select 
            value={selectedStageId} 
            onValueChange={setSelectedStageId} 
            disabled={!selectedTournamentId || stagesLoading}
          >
            <SelectTrigger className="w-full md:w-56 bg-blue-950 border-blue-700 text-blue-100">
              <SelectValue placeholder={stagesLoading ? "Loading stages..." : "Select a stage"} />
            </SelectTrigger>            <SelectContent>
              <SelectItem value={ALL_TEAMS_OPTION}>All Teams in Tournament</SelectItem>
              {filteredStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name} ({stage.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
            <DownloadIcon size={16} /> Export
          </Button>          <Button 
            onClick={() => {
              setShowImportCard(!showImportCard);
              if (!showImportCard) {
                // Reset form when opening
                setImportContent("");
                setImportResult(null);
                setImportError(null);
                setDelimiter(",");
              }
            }} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <UploadIcon size={16} /> Import
          </Button>
          
          <TeamStatsRecalculateButton
            tournamentId={selectedTournamentId}
            stageId={selectedStageId}
            disabled={!selectedTournamentId}
            variant="outline"
            size="default"
          />
        </div>
      </div>      {showImportCard && (
        <Card className="mb-6 border-2 border-blue-700 bg-gradient-to-br from-blue-950 to-blue-900 shadow-xl">
          <CardContent className="py-6">
            <div className="flex items-center gap-2 mb-4">
              <UploadIcon size={22} className="text-blue-400" />
              <h3 className="font-bold text-lg text-blue-200 tracking-wide">Import Teams from CSV</h3>
            </div>
            
            {/* Tournament Selection */}
            <div className="mb-4">
              <label className="block mb-2 font-semibold text-blue-300">Select Tournament</label>              <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                <SelectTrigger className="w-full bg-blue-950 border-blue-700 text-blue-100">
                  <SelectValue placeholder={tournamentsLoading ? "Loading tournaments..." : "Select a tournament"} />
                </SelectTrigger>
                <SelectContent>
                  {tournaments?.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedTournamentId ? (
                <p className="text-blue-400 text-xs mt-1">⚠️ A tournament must be selected to import teams</p>
              ) : (
                <p className="text-green-400 text-xs mt-1">✓ Tournament selected: {tournaments?.find(t => t.id === selectedTournamentId)?.name}</p>
              )}
            </div>

            {/* CSV Delimiter Selection */}
            <div className="mb-4">
              <label className="block mb-2 font-semibold text-blue-300">CSV Delimiter</label>
              <Select value={delimiter} onValueChange={setDelimiter}>
                <SelectTrigger className="w-full bg-blue-950 border-blue-700 text-blue-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">, (Comma)</SelectItem>
                  <SelectItem value=";">; (Semicolon)</SelectItem>
                  <SelectItem value={"\t"}>Tab</SelectItem>
                  <SelectItem value="|">| (Pipe)</SelectItem>
                </SelectContent>
              </Select>
            </div>            <div className="mb-4 text-blue-100 text-sm">
              <span className="font-semibold text-blue-300">Instructions:</span> Follow these steps to import teams:
              <ol className="mt-2 ml-4 space-y-1 text-blue-200">
                <li>1. <span className="font-semibold text-blue-300">Select a tournament</span> from the dropdown above</li>
                <li>2. <span className="font-semibold text-blue-300">Choose CSV delimiter</span> that matches your file format</li>
                <li>3. <span className="font-semibold text-blue-300">Upload a CSV file</span> or paste CSV content below</li>
                <li>4. <span className="font-semibold text-blue-300">Click Import</span> when all fields are filled</li>
              </ol>
              <div className="mt-3 p-2 bg-blue-800/40 rounded border border-blue-600">
                <span className="text-blue-300 font-semibold">Required CSV columns:</span> 
                <span className="font-mono bg-blue-800/60 px-1 rounded ml-1">Name</span>, 
                <span className="font-mono bg-blue-800/60 px-1 rounded ml-1">Organization</span>, 
                <span className="font-mono bg-blue-800/60 px-1 rounded ml-1">Description</span>
              </div>
            </div>
            
            <label className="block mb-2 font-semibold text-blue-300">Upload CSV File</label>            <input
              type="file"
              accept=".csv"
              className="mb-4 block w-full text-sm text-blue-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-800/80 file:text-blue-200 hover:file:bg-blue-700/80"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                
                // Always set the content directly, and also send to worker for validation
                setImportContent(text);
                setImportError(null);
                
                if (workerRef.current) {
                  workerRef.current.postMessage({ csvText: text });
                }
              }}
            />
            <label className="block mb-2 font-semibold text-blue-300 mt-4">Or Paste CSV Content</label>
            <textarea
              className="w-full h-32 p-2 rounded border border-blue-700 bg-blue-950 text-blue-100 mb-2 focus:ring-2 focus:ring-blue-400"
              placeholder="Paste CSV content here. Columns: Name, Organization, Description."
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
            />            {importError && (
              <div className="text-red-400 text-sm mb-2 font-semibold border-l-4 border-red-500 pl-2 bg-red-950/60 py-1">{importError}</div>
            )}
            
            {/* Success indicator when content is loaded */}
            {importContent && !importError && (
              <div className="text-green-400 text-sm mb-2 font-semibold border-l-4 border-green-500 pl-2 bg-green-950/60 py-1">
                ✓ CSV content loaded ({importContent.split('\n').length} rows)
              </div>
            )}
            {/* Preview first 3 rows if available */}
            {importContent && (
              <div className="bg-blue-900/80 text-blue-100 rounded p-3 mb-3 text-xs border border-blue-700">
                <div className="font-bold mb-1 text-blue-300">Preview:</div>
                {importContent.split('\n').slice(0, 3).map((row, i) => (
                  <div key={i} className="font-mono text-blue-200">{row}</div>
                ))}                {importContent.split('\n').length > 3 && <div className="text-blue-400">...</div>}
              </div>
            )}            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handleImport} 
                disabled={isImporting || !importContent.trim() || !selectedTournamentId} 
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-6 py-2 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UploadIcon size={16} className="mr-2" /> 
                {isImporting ? "Importing..." : "Import"}
              </Button>              <Button 
                variant="outline" 
                onClick={() => {
                  setImportResult(null);
                  setImportError(null);
                }} 
                className="border-blue-700 text-blue-200 hover:bg-blue-800/30"
              >
                Reset
              </Button>
            </div>            {(isImporting || !importContent.trim() || !selectedTournamentId) && (
              <div className="mt-2 text-xs text-blue-400">
                <span className="font-semibold">Import button disabled because:</span>
                <ul className="ml-2 mt-1">
                  {isImporting && <li>• Currently importing...</li>}
                  {!selectedTournamentId && <li>• No tournament selected</li>}
                  {!importContent.trim() && <li>• No CSV content provided</li>}
                </ul>
              </div>
            )}
            
            {importResult && (
              <div className={`mt-4 text-sm font-semibold px-3 py-2 rounded ${importResult.success ? "bg-green-900/80 text-green-300 border-l-4 border-green-500" : "bg-red-900/80 text-red-300 border-l-4 border-red-500"}`}>
                {importResult.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <LeaderboardTable
        data={filteredRows}
        columns={teamLeaderboardColumns}
        loading={dataLoading}
        filterUI={
          <LeaderboardFilters
            teamName={teamName}
            setTeamName={setTeamName}
            teamCode={teamCode}
            setTeamCode={setTeamCode}
            rankRange={rankRange}
            setRankRange={setRankRange}
            totalScoreRange={totalScoreRange}
            setTotalScoreRange={setTotalScoreRange}
          />
        }
        initialSorting={[{ id: "rank", desc: false }]}
        emptyMessage="No teams found."
      />
    </div>
  );
}
