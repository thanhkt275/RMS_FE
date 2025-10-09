"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import BracketColumn from "@/components/features/bracket/bracket-column";
import type { NormalizedBracket } from "@/utils/bracket-normalizer";
import type { Match, StageBracketResponse } from "@/types/match.types";
import type { Match as StageMatch } from "@/types/types";
import type { PlayoffBracketDisplayProps } from "@/components/features/bracket/PlayoffBracketDisplay";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import the simple bracket display from audience display that has working connection lines
const SimplePlayoffBracketDisplay = dynamic(
  () =>
    import("@/components/features/audience-display/displays/playoff-bracket-display").then(
      (mod) => mod.PlayoffBracketDisplay
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center text-sm text-slate-500">
        Preparing bracket view…
      </div>
    ),
  }
);

const DynamicPlayoffBracketDisplay = dynamic<PlayoffBracketDisplayProps>(
  () =>
    import("@/components/features/bracket/PlayoffBracketDisplay").then(
      (mod) => mod.PlayoffBracketDisplay
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center text-sm text-slate-500">
        Preparing bracket view…
      </div>
    ),
  }
);

interface BracketViewProps {
  normalizedBracket: NormalizedBracket;
  stageName?: string;
  stageType?: string;
  generatedAt?: string;
  teamsPerAlliance?: number;
  rawBracket?: StageBracketResponse | null;
  matches?: StageMatch[] | Match[] | null;
}

const BracketView = ({
  normalizedBracket,
  stageName,
  stageType,
  generatedAt,
  teamsPerAlliance,
  rawBracket,
  matches,
}: BracketViewProps) => {
  const bracketMatchMap = useMemo(() => {
    const map = new Map<string, any>();

    // Add matches from props with proper type handling
    matches?.forEach((match: any) => {
      // Ensure scheduledTime is defined for compatibility
      const normalizedMatch = {
        ...match,
        scheduledTime: match.scheduledTime || new Date().toISOString(),
        matchNumber: match.matchNumber ?? 0,
      };
      map.set(normalizedMatch.id, normalizedMatch);
    });

    // Add matches from rawBracket if not already present
    rawBracket?.matches.forEach((match) => {
      if (!map.has(match.id)) {
        map.set(match.id, match);
      }
    });

    return map;
  }, [matches, rawBracket]);

  const playoffMatches = useMemo(() => {
    if (!rawBracket || rawBracket.structure.type !== "elimination") {
      return [];
    }

    const processedMatches: any[] = [];

    rawBracket.structure.rounds.forEach((round, roundIndex) => {
      round.matches.forEach((matchId, matchIndex) => {
        const match = bracketMatchMap.get(matchId);
        if (!match) {
          return;
        }

        processedMatches.push({
          ...match,
          roundNumber: match.roundNumber ?? round.roundNumber ?? roundIndex + 1,
          bracketSlot: match.bracketSlot ?? matchIndex + 1,
        });
      });
    });

    return processedMatches;
  }, [bracketMatchMap, rawBracket]);

  const canUsePlayoffBracket =
    normalizedBracket.type === "elimination" &&
    rawBracket?.structure.type === "elimination" &&
    playoffMatches.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold text-gray-900">
            {stageName ? `${stageName} Bracket` : "Stage Bracket"}
          </h4>
          {stageType && (
            <p className="text-sm text-gray-600 capitalize">{stageType.toLowerCase()} stage</p>
          )}
          {typeof teamsPerAlliance === "number" && teamsPerAlliance > 0 && (
            <p className="text-xs text-gray-500">Alliance size: {teamsPerAlliance}</p>
          )}
        </div>
        {generatedAt && (
          <span className="text-xs text-gray-500">
            Updated {new Date(generatedAt).toLocaleString()}
          </span>
        )}
      </header>

      {normalizedBracket.type === "swiss" && normalizedBracket.buckets.length > 0 && (
        <TooltipProvider>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-semibold text-gray-800">Record Buckets</h5>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold cursor-help"
                    aria-label="Swiss bracket explanation"
                  >
                    ?
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-sm text-blue-50 bg-blue-700">
                  Teams move between buckets based on wins and losses. Arrows indicate where winners and losers advance after each round.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex flex-wrap gap-2">
              {normalizedBracket.buckets.map((bucket) => (
                <div
                  key={bucket.record}
                  className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold"
                >
                  {bucket.record} • {bucket.matches.length} match{bucket.matches.length === 1 ? "" : "es"}
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
      )}

      {canUsePlayoffBracket ? (
        <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg">
          {/* Compact bracket info */}
          {typeof teamsPerAlliance === "number" && teamsPerAlliance > 2 && (
            <div className="absolute top-3 right-3 z-10 bg-blue-50/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200/50 shadow-sm">
              {teamsPerAlliance}v{teamsPerAlliance}
            </div>
          )}
          <div className="w-full min-h-[480px]">
            <SimplePlayoffBracketDisplay
              matches={playoffMatches}
              stageName={stageName}
              stageType={stageType as "PLAYOFF" | "FINAL"}
            />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-full snap-x snap-mandatory pb-2">
            {normalizedBracket.columns.map((column) => (
              <BracketColumn key={column.key} label={column.label} matches={column.matches} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BracketView;
