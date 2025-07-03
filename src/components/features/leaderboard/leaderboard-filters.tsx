import React from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export interface LeaderboardFiltersProps {
  teamName: string;
  setTeamName: (v: string) => void;
  teamCode: string;
  setTeamCode: (v: string) => void;
  rankRange: [number, number];
  setRankRange: (v: [number, number]) => void;
  totalScoreRange: [number, number];
  setTotalScoreRange: (v: [number, number]) => void;
  // Add more filter props as needed
}

export function LeaderboardFilters({
  teamName,
  setTeamName,
  teamCode,
  setTeamCode,
  rankRange,
  setRankRange,
  totalScoreRange,
  setTotalScoreRange,
}: LeaderboardFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Team Name</label>
        <Input
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          placeholder="Search by name"
          className="w-40"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Team Code</label>
        <Input
          value={teamCode}
          onChange={e => setTeamCode(e.target.value)}
          placeholder="Search by code"
          className="w-32"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Rank Range</label>
        <Slider
          min={1}
          max={100}
          value={rankRange}
          onValueChange={setRankRange}
          className="w-40"
        />
        <div className="text-xs text-gray-300 mt-1">{rankRange[0]} - {rankRange[1]}</div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Total Score</label>
        <Slider
          min={0}
          max={1000}
          value={totalScoreRange}
          onValueChange={setTotalScoreRange}
          className="w-40"
        />
        <div className="text-xs text-gray-300 mt-1">{totalScoreRange[0]} - {totalScoreRange[1]}</div>
      </div>
    </div>
  );
}