"use client";

import BracketMatchCard from "@/components/features/bracket/bracket-match-card";
import type { BracketMatch } from "@/types/match.types";

interface BracketColumnProps {
  label: string;
  matches: BracketMatch[];
}

const BracketColumn = ({ label, matches }: BracketColumnProps) => {
  return (
    <div className="flex flex-col gap-3 min-w-[240px] snap-start">
      <h4 className="text-center text-sm font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </h4>
      <div className="flex flex-col gap-3">
        {matches.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-xl px-4 py-6 text-center text-sm text-gray-500 bg-gray-50">
            No matches scheduled
          </div>
        ) : (
          matches.map((match) => <BracketMatchCard key={match.id} match={match} />)
        )}
      </div>
    </div>
  );
};

export default BracketColumn;
